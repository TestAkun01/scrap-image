import React from "react";

const ConfigForm = ({
  baseUrl,
  setBaseUrl,
  maxDepth,
  setMaxDepth,
  maxImageSize,
  setMaxImageSize,
  allowedExtensions,
  setAllowedExtensions,
}) => (
  <div className="mb-4 space-y-4">
    <div>
      <label className="block font-semibold">Base URL:</label>
      <input
        type="text"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        className="w-full border p-2 rounded"
      />
    </div>
    <div>
      <label className="block font-semibold">Max Depth:</label>
      <input
        type="number"
        value={maxDepth}
        onChange={(e) => setMaxDepth(Number(e.target.value))}
        className="w-full border p-2 rounded"
      />
    </div>
    <div>
      <label className="block font-semibold">Max Image Size (Bytes):</label>
      <input
        type="number"
        value={maxImageSize}
        onChange={(e) => setMaxImageSize(Number(e.target.value))}
        className="w-full border p-2 rounded"
      />
    </div>
    <div>
      <label className="block font-semibold">Allowed Extensions:</label>
      <input
        type="text"
        value={allowedExtensions}
        onChange={(e) => setAllowedExtensions(e.target.value)}
        className="w-full border p-2 rounded"
      />
    </div>
  </div>
);

export default ConfigForm;
