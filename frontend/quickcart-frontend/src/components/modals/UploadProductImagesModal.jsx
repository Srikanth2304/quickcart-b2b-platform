import { useState } from "react";

export default function UploadProductImagesModal({ open, product, submitting, onClose, onSubmit }) {
  const [imageUrls, setImageUrls] = useState([""]);
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  if (!open || !product) return null;

  const updateImage = (index, value) => {
    setImageUrls((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addImage = () => setImageUrls((prev) => [...prev, ""]);
  const removeImage = (index) => setImageUrls((prev) => prev.filter((_, idx) => idx !== index));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      imageUrls: imageUrls.map((item) => item.trim()).filter(Boolean),
      thumbnailUrl: thumbnailUrl.trim(),
    });
  };

  return (
    <div className="sa-modal-backdrop" onClick={onClose} role="presentation">
      <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header>Upload Product Images</header>
        <form onSubmit={handleSubmit}>
          <section>
            {imageUrls.map((url, index) => (
              <div key={index} style={{ display: "flex", gap: 8 }}>
                <input
                  className="sa-input"
                  placeholder="Image URL"
                  value={url}
                  onChange={(e) => updateImage(index, e.target.value)}
                />
                <button type="button" className="sa-btn danger" onClick={() => removeImage(index)} disabled={imageUrls.length === 1}>Remove</button>
              </div>
            ))}
            <button type="button" className="sa-btn ghost" onClick={addImage}>Add Image URL</button>
            <input
              className="sa-input"
              placeholder="Thumbnail URL"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
            />
          </section>
          <footer>
            <button type="button" className="sa-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="sa-btn primary" disabled={submitting}>{submitting ? "Uploading..." : "Upload"}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
