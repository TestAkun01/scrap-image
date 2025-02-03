import axios from "axios";
import puppeteer from "puppeteer";
import sharp from "sharp";
import * as cheerio from "cheerio";
import logToFile from "@/utils/logToFile";
import normalizeUrl from "@/utils/normalizeUrl";
import path from "path";

let imageDatas = {};
let visitedLinks = new Map();
let exploredLinks = 0;
let totalLinks = 0;

class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(item) {
    this.items.push(item);
  }

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

async function saveImageDatas(imgUrl, imgData) {
  try {
    const { size, width, height, format } = imgData;
    let imgName, extension;

    if (imgUrl.startsWith("data:image/")) {
      const match = imgUrl.match(/data:image\/([a-zA-Z0-9]+);base64,/);
      extension = match ? `.${match[1]}` : ".svg";
      imgName = `image-${Date.now()}${extension}`;
    } else {
      imgName = path.basename(imgUrl);
      extension = path.extname(imgName).toLowerCase();
      const MAX_NAME_LENGTH = 50;

      if (imgName.length > MAX_NAME_LENGTH) {
        imgName = `${imgName.slice(
          0,
          MAX_NAME_LENGTH - extension.length - 1
        )}-${Date.now()}${extension}`;
      }
    }
    logToFile("link.log", imgUrl);
    imageDatas[imgUrl] = {
      name: imgName,
      dimensions: `${width || "unknown"} x ${height || "unknown"}`,
      format: format || "unknown",
      size,
      extension,
    };
  } catch (error) {
    console.error(`Failed to save image data: ${imgUrl} - ${error.message}`);
  }
}

async function getImageInfo(imgBufferOrDataURL) {
  let imgBuffer;

  if (
    typeof imgBufferOrDataURL === "string" &&
    imgBufferOrDataURL.startsWith("data:image/")
  ) {
    const base64Data = imgBufferOrDataURL.split(",")[1];
    const contentType = imgBufferOrDataURL.split(";")[0].split(":")[1];

    if (contentType === "image/svg+xml") {
      return {
        width: null,
        height: null,
        format: "svg",
        size: (base64Data.length * 3) / 4,
      };
    }

    imgBuffer = Buffer.from(base64Data, "base64");
  } else {
    imgBuffer = imgBufferOrDataURL;
  }

  const img = sharp(imgBuffer);
  return await img.metadata();
}

async function isImage(url) {
  if (visitedLinks.has(url)) {
    return visitedLinks.get(url).isImg;
  }

  const isDataImage = url.startsWith("data:image/");
  if (isDataImage) {
    visitedLinks.set(url, { isImg: true });
    return true;
  }

  try {
    const response = await axios.head(url, { maxRedirects: 5 });
    const isImg = response.headers["content-type"]?.startsWith("image");
    visitedLinks.set(url, { isImg });
    return isImg;
  } catch {
    visitedLinks.set(url, { isImg: false });
    return false;
  }
}

async function extractImages($, url) {
  const imgPromises = $("img")
    .map(async (i, img) => {
      const imgUrl = new URL($(img).attr("src"), url).href;

      if (visitedLinks.has(imgUrl)) {
        logToFile(
          "visited_links.log",
          `Skipped duplicate image URL: ${imgUrl}`
        );
        return;
      }

      const isImg = await isImage(imgUrl);

      if (isImg) {
        let imgData;

        if (imgUrl.startsWith("data:image/")) {
          imgData = await getImageInfo(imgUrl);
        } else {
          const imgResponse = await axios.get(imgUrl, {
            responseType: "arraybuffer",
          });
          imgData = await getImageInfo(imgResponse.data);
        }

        await saveImageDatas(imgUrl, imgData);
        logToFile(
          "visited_links.log",
          `Image data extracted and saved: ${imgUrl}`
        );
      } else {
        logToFile("visited_links.log", `Skipped non-image URL: ${imgUrl}`);
      }
    })
    .get();

  await Promise.allSettled(imgPromises);
}

async function extractImagesFromCSS(cssUrl) {
  if (visitedLinks.has(cssUrl)) {
    logToFile("visited_links.log", `Skipped duplicate CSS URL: ${cssUrl}`);
    return;
  }

  visitedLinks.set(cssUrl);
  logToFile("visited_links.log", `Exploring CSS file: ${cssUrl}`);

  try {
    const response = await axios.get(cssUrl);
    const cssContent = response.data;
    const urlRegex = /url\(["']?([^"')]+)["']?\)/g;
    let match;

    const cssImgPromises = [];
    while ((match = urlRegex.exec(cssContent))) {
      const imgUrl = match[1];
      const fullImgUrl = new URL(imgUrl, cssUrl).href;

      if (visitedLinks.has(fullImgUrl)) {
        logToFile(
          "visited_links.log",
          `Skipped duplicate image URL from CSS: ${fullImgUrl}`
        );
        continue;
      }

      cssImgPromises.push(
        isImage(fullImgUrl).then(async (isImg) => {
          if (isImg) {
            let imgData;

            if (fullImgUrl.startsWith("data:image/")) {
              imgData = await getImageInfo(fullImgUrl);
            } else {
              const imgResponse = await axios.get(fullImgUrl, {
                responseType: "arraybuffer",
              });
              imgData = await getImageInfo(imgResponse.data);
            }

            await saveImageDatas(fullImgUrl, imgData);
            logToFile(
              "visited_links.log",
              `Image data extracted and saved from CSS: ${fullImgUrl}`
            );
          } else {
            logToFile(
              "visited_links.log",
              `Skipped non-image URL from CSS: ${fullImgUrl}`
            );
          }
        })
      );
    }

    await Promise.allSettled(cssImgPromises);
  } catch (error) {
    console.error(
      `Failed to extract images from CSS: ${cssUrl} - ${error.message}`
    );
  }
}

async function exploreLinks(url, depth, config, browser) {
  const normalizedUrl = normalizeUrl(url);

  const queue = new Queue();
  queue.enqueue({ url: normalizedUrl, depth });

  while (!queue.isEmpty()) {
    const { url: currentUrl, depth: currentDepth } = queue.dequeue();

    if (currentDepth > config.maxDepth || visitedLinks.has(normalizedUrl))
      continue;

    visitedLinks.set(currentUrl);
    exploredLinks++;
    const startTime = Date.now();

    const page = await browser.newPage();
    try {
      await page.goto(currentUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      const html = await page.content();
      const $ = cheerio.load(html);

      await extractImages($, currentUrl);

      const cssPromises = $("link[rel='stylesheet']")
        .map((i, link) => {
          const cssUrl = new URL($(link).attr("href"), currentUrl).href;
          return extractImagesFromCSS(cssUrl);
        })
        .get();

      await Promise.allSettled(cssPromises);

      const links = $("a[href]")
        .map((i, link) => {
          const normalizedLink = normalizeUrl(
            new URL($(link).attr("href"), currentUrl).href
          );
          return normalizedLink.startsWith(config.baseUrl) &&
            !visitedLinks.has(normalizedLink)
            ? normalizedLink
            : null;
        })
        .get()
        .filter(Boolean);

      links.forEach((link) => {
        totalLinks++;
        queue.enqueue({ url: link, depth: currentDepth + 1 });
        visitedLinks.set(link);
      });
    } catch (error) {
      console.error(`Error exploring link ${currentUrl}: ${error.message}`);
    } finally {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logToFile(
        "visited_links.log",
        `Visited: ${currentUrl} - Time taken: ${duration} seconds - Depth: ${currentDepth}`
      );
      await page.close();
    }
  }
}

export async function POST(req) {
  try {
    const { baseUrl, maxDepth, maxImageSize, allowedExtensions } =
      await req.json();
    const config = {
      baseUrl,
      maxDepth: parseInt(maxDepth, 10) || 2,
      maxImageSize: parseInt(maxImageSize, 10) || 5 * 1024 * 1024,
      allowedExtensions: new Set(allowedExtensions || []),
    };

    const browser = await puppeteer.launch();
    await exploreLinks(config.baseUrl, 0, config, browser);
    await browser.close();

    return new Response(
      JSON.stringify({
        success: true,
        totalLinks: visitedLinks.size,
        exploredLinks,
        imageDatas,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
