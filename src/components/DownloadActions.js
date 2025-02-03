import React from "react";

const DownloadActions = ({ fetchImages, downloadImages }) => (
  <div className="flex space-x-4 mt-4">
    <button
      className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 transition"
      onClick={fetchImages}
    >
      Fetch Images
    </button>
    <button
      className="bg-green-500 text-white font-semibold py-2 px-4 rounded hover:bg-green-600 transition"
      onClick={downloadImages}
    >
      Download Selected Images
    </button>
  </div>
);

export default DownloadActions;
