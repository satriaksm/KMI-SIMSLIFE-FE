export const compressImage = (file, maxWidth = 1920) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Jika lebar gambar melebihi batas maksimal, kecilkan ukurannya dengan menjaga rasio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Konversi canvas menjadi file .jpg baru
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const originalName = file.name || "image.jpg";
              resolve(
                new File([blob], originalName.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
              );
            } else {
              reject(new Error("Gagal mengkompresi gambar"));
            }
          },
          "image/jpeg",
          0.8 // Kualitas kompresi 80%
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};