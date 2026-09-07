export const PHOTO_HINT = "Фото до 20 МБ: JPEG, PNG, WebP. Перед отправкой уменьшим автоматически. Если HEIC не открывается, выберите JPEG.";
export const WISH_PHOTO_HINT = "Фото желания до 50 МБ: JPEG, PNG, WebP. Автоматически уменьшим перед отправкой. Для HEIC при ошибке выберите JPEG.";

export async function preparePhoto(file: File, purpose: string): Promise<File> {
  const limit=purpose === "wish" ? 50 : 20;
  if (!file.size || file.size > limit * 1024 * 1024) throw new Error(`Выберите фотографию до ${limit} МБ.`);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Этот формат фото не открывается. Выберите JPEG, PNG или WebP. Для HEIC сохраните копию в JPEG.")); });
    const scale = Math.min(1, (purpose === "avatar" ? 640 : 1800) / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Не удалось подготовить фото. Попробуйте другой файл.");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= 700 * 1024) return new File([blob], "photo.jpg", { type: "image/jpeg" });
    }
    throw new Error("Фото слишком детальное. Выберите меньший размер или обрежьте изображение.");
  } finally { URL.revokeObjectURL(url); }
}
