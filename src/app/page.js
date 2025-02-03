"use client";
import { useState } from "react";
import ImageFetcher from "@/components/ImageFetcher";
import ImageCard from "@/components/ImageCard";
import LoadingIndicator from "@/components/LoadingIndicator";

export default function Page() {
  const [imagesData, setImagesData] = useState([]);

  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleSelection = (url) => {
    setSelectedImages((prevSelected) =>
      prevSelected.includes(url)
        ? prevSelected.filter((imageUrl) => imageUrl !== url)
        : [...prevSelected, url]
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full min-h-screen mx-auto p-6">
      <div className="col-span-1 bg-gray-50 p-6 rounded-md shadow">
        <ImageFetcher
          setImagesData={setImagesData}
          imagesData={imagesData}
          setLoading={setLoading}
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
        />
      </div>

      <div className="col-span-2 bg-white p-6 rounded-md shadow">
        {loading ? (
          <LoadingIndicator />
        ) : (
          <>
            {imagesData.length === 0 ? (
              <div className="text-center text-gray-500 mt-4">
                <p>
                  No images available. Try fetching images using the form on the
                  left.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {imagesData.map((image) => (
                  <ImageCard
                    key={image.url}
                    image={image}
                    toggleSelection={() => toggleSelection(image.url)}
                    isSelected={selectedImages.includes(image.url)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
