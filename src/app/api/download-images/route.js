import fs from "fs";
import path from "path";
import os from "os";
import archiver from "archiver";
import axios from "axios";

const checkApiKey = (req) => {
  const apiKey = req.headers.get("x-api-key");
  return apiKey === process.env.API_KEY;
};

export async function POST(req) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!checkApiKey(req)) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid API key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { urls } = await req.json();
  if (!urls || !urls.length) {
    return new Response(
      JSON.stringify({ success: false, message: "No images provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const tempDir = os.tmpdir();
  const zipFilePath = path.join(tempDir, "images.zip");

  const downloadPromises = urls.map(async (url) => {
    const fileName = path.basename(url);
    const filePath = path.join(tempDir, fileName);
    try {
      const response = await axios.get(url, { responseType: "stream" });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      return new Promise((resolve, reject) => {
        writer.on("finish", () => resolve(filePath));
        writer.on("error", reject);
      });
    } catch (error) {
      console.error(`Failed to download ${url}:`, error);
      return null;
    }
  });

  try {
    const downloadedFiles = (await Promise.allSettled(downloadPromises))
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .filter(Boolean);

    if (!downloadedFiles.length) {
      throw new Error("No files downloaded successfully.");
    }

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver("zip");

      output.on("close", () => {
        console.log(`${archive.pointer()} total bytes`);
        resolve(
          new Response(
            JSON.stringify({
              success: true,
              downloadUrl: `/api/download-images?file=images.zip`,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      });

      archive.on("error", (err) => {
        console.error("Failed to create ZIP:", err);
        reject(
          new Response(
            JSON.stringify({
              success: false,
              message: "Failed to create ZIP file.",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          )
        );
      });

      archive.pipe(output);

      downloadedFiles.forEach((filePath) => {
        const fileName = path.basename(filePath);
        archive.file(filePath, { name: fileName });
      });

      archive.finalize();
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to process images." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const fileName = url.searchParams.get("file");

  if (!fileName) {
    return new Response("File name not provided", { status: 400 });
  }

  const filePath = path.join(os.tmpdir(), fileName);

  if (!fs.existsSync(filePath)) {
    return new Response("File not found", { status: 404 });
  }

  const fileStream = fs.createReadStream(filePath);

  return new Response(fileStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${fileName}`,
    },
  });
}
