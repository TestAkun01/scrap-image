const ImageCard = ({ image, toggleSelection, isSelected }) => {
  return (
    <div className="border border-gray-300 rounded-lg shadow p-4 text-center bg-white">
      <div className="flex items-center justify-center h-48 max-w-full">
        <img
          src={image.url}
          alt="Image"
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="text-sm text-gray-600">
        <p>Name: {image.name}</p>
        <p>Dimensions: {image.dimensions}</p>
        <p>Size: {image.size}</p>
        <p>Extension: {image.extension}</p>
      </div>
      <label className="block mt-2">
        <input
          type="checkbox"
          value={image.url}
          checked={isSelected}
          onChange={toggleSelection}
          className="mr-2"
        />
        Select for download
      </label>
    </div>
  );
};

export default ImageCard;
