import toast from 'react-hot-toast';

export const getAllBrochureUrls = (brochureRaw) => {
  if (!brochureRaw) return [];
  if (Array.isArray(brochureRaw)) {
    return brochureRaw.map(s => String(s).trim()).filter(Boolean);
  }
  if (typeof brochureRaw === 'string') {
    return brochureRaw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

export const downloadBrochurePDF = async (brochureRaw, projectName = "Project", imageTags = []) => {
  const urls = getAllBrochureUrls(brochureRaw);
  if (!urls || urls.length === 0) {
    toast.error("Brochure not available for this project.");
    return;
  }

  // If single PDF file
  if (urls.length === 1 && urls[0].toLowerCase().includes('.pdf')) {
    window.open(urls[0], '_blank');
    return;
  }

  const toastId = toast.loading(`Preparing Brochure PDF (${urls.length} ${urls.length === 1 ? 'page' : 'pages'})...`);

  try {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const loadImage = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = url;
      });
    };

    let addedPages = 0;

    for (let i = 0; i < urls.length; i++) {
      toast.loading(`Processing brochure page ${i + 1} of ${urls.length}...`, { id: toastId });
      try {
        const img = await loadImage(urls[i]);
        const imgRatio = img.width / img.height;
        let renderWidth = pageWidth;
        let renderHeight = pageWidth / imgRatio;

        if (renderHeight > pageHeight) {
          renderHeight = pageHeight;
          renderWidth = pageHeight * imgRatio;
        }

        const xOffset = (pageWidth - renderWidth) / 2;
        const yOffset = (pageHeight - renderHeight) / 2;

        // Dynamic Tag Label lookup with default room fallbacks so every image gets tagged
        const DEFAULT_TAGS = ["Elevation", "Hall", "Kitchen", "Master Bedroom", "Bedroom", "Balcony", "Bathroom", "Amenities", "Project Overview"];
        let tagLabel = "";
        if (Array.isArray(imageTags)) {
          tagLabel = imageTags[i] || "";
        } else if (imageTags && typeof imageTags === 'object') {
          tagLabel = imageTags[i] || imageTags[String(i)] || "";
        }
        if (!tagLabel || typeof tagLabel !== 'string' || tagLabel.trim() === '') {
          tagLabel = DEFAULT_TAGS[i % DEFAULT_TAGS.length];
        }

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        if (addedPages > 0) {
          pdf.addPage();
        }

        // Draw image onto PDF page
        pdf.addImage(dataUrl, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);

        // Draw Tag Badge in the PDF Page TOP WHITE SPACE (Top Center above image)
        if (tagLabel && typeof tagLabel === 'string' && tagLabel.trim() !== '') {
          const cleanTag = tagLabel.trim();
          const fontSize = 14;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(fontSize);

          const textWidth = pdf.getTextWidth(cleanTag);
          const badgeWidth = textWidth + 24;
          const badgeHeight = 22;

          const badgeX = (pageWidth - badgeWidth) / 2;
          
          // Place in top white space margin (if yOffset > 30, place nicely inside top white space)
          let badgeY = Math.max(12, (yOffset / 2) - (badgeHeight / 2));
          if (yOffset <= 30) {
            badgeY = 12; // top 12px margin
          }

          // Draw Dark Slate Pill Badge
          pdf.setFillColor(15, 23, 42); // Dark slate blue
          pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 11, 11, 'F');

          // Draw White Tag Text
          pdf.setTextColor(255, 255, 255);
          pdf.text(cleanTag, pageWidth / 2, badgeY + 15, { align: 'center' });
        }

        addedPages++;
      } catch (err) {
        console.warn(`Failed to process image ${urls[i]} for PDF:`, err);
      }
    }

    if (addedPages === 0) {
      toast.error("Could not load brochure images.", { id: toastId });
      return;
    }

    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`${safeName}_Brochure.pdf`);
    toast.success("Brochure PDF downloaded successfully!", { id: toastId, duration: 3000 });
  } catch (err) {
    console.error("PDF generation failed:", err);
    // Fallback: open 1st image URL in browser
    window.open(urls[0], '_blank');
    toast.error("Opening brochure file...", { id: toastId, duration: 3000 });
  }
};
