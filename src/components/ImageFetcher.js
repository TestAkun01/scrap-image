import { useState } from "react";
import axios from "axios";

const formatSize = (sizeInBytes) => {
  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (sizeInBytes >= 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${sizeInBytes} B`;
  }
};

const ImageFetcher = ({
  setImagesData,
  setLoading,
  imagesData,
  selectedImages,
  setSelectedImages,
}) => {
  const [baseUrl, setBaseUrl] = useState(
    "https://bang-dream-gbp-en.bushiroad.com"
  );
  const [maxDepth, setMaxDepth] = useState(1);
  const [maxImageSize, setMaxImageSize] = useState(5 * 1024 * 1024);
  const [exploredLinks, setExploredLinks] = useState(0);
  const [visitedLinks, setVisitedLinks] = useState(0);
  const [allowedExtensions, setAllowedExtensions] = useState(
    ".jpg,.jpeg,.png,.gif,.svg"
  );
  const [allSelected, setAllSelected] = useState(false);

  const fetchImageData = async () => {
    setLoading(true);
    try {
      const response = await axios.post("/api/get-images", {
        baseUrl,
        maxDepth,
        maxImageSize,
        allowedExtensions: allowedExtensions.split(","),
      });

      if (response.data.success) {
        setImagesData(
          Object.entries(response.data.imageDatas).map(([url, data]) => ({
            url,
            name: data.name,
            dimensions: data.dimensions,
            size: formatSize(data.size),
            extension: data.extension,
          }))
        );
        setExploredLinks(response.data.exploredLinks);
        setVisitedLinks(response.data.totalLinks);
      } else {
        alert("Failed to fetch images data.");
      }
    } catch (error) {
      console.error("Error fetching images data:", error);
      alert("An error occurred while fetching images data.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedImages([]);
    } else {
      setSelectedImages(imagesData.map((image) => image.url));
    }
    setAllSelected(!allSelected);
  };

  const downloadSelectedImages = async () => {
    if (selectedImages.length === 0) {
      alert("Please select at least one image to download.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        "/api/download-images",
        {
          urls: selectedImages,
        },
        { headers: { "x-api-key": process.env.NEXT_PUBLIC_API_KEY } }
      );
      if (response.data.success) {
        const downloadUrl = response.data.downloadUrl;
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "images.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("Images are being downloaded successfully!");
      } else {
        alert("Failed to download images.");
      }
    } catch (error) {
      console.error("Error downloading images:", error);
      alert("An error occurred while downloading images.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 p-6 border border-gray-300 rounded-lg shadow-md bg-white">
      <h2 className="text-lg font-semibold mb-4">Fetch Images</h2>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Base URL:
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Max Depth:
            <input
              type="number"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Max Image Size (Bytes):
            <input
              type="number"
              value={maxImageSize}
              onChange={(e) => setMaxImageSize(Number(e.target.value))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Allowed Extensions (comma-separated):
            <input
              type="text"
              value={allowedExtensions}
              onChange={(e) => setAllowedExtensions(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2"
            />
          </label>
        </div>
      </div>
      <button
        className="w-full bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 transition mb-4"
        onClick={fetchImageData}>
        Fetch Images
      </button>

      {/* Button actions */}
      <div>
        <button
          className="mb-4 bg-green-500 text-white font-semibold py-2 px-4 rounded hover:bg-green-600 transition"
          onClick={downloadSelectedImages}>
          Download Selected Images
        </button>
        <button
          className="mb-4 ml-4 bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 transition"
          onClick={toggleSelectAll}>
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      {/* Display visited and explored links */}
      <div className="mt-4">
        <p className="text-sm font-medium">
          Visited Links: <span className="font-bold">{visitedLinks}</span>
        </p>
        <p className="text-sm font-medium">
          Explored Links: <span className="font-bold">{exploredLinks}</span>
        </p>
      </div>
    </div>
  );
};

export default ImageFetcher;
