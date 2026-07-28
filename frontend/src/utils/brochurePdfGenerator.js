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

export const downloadBrochurePDF = async (brochureRaw, projectName = "Project") => {
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

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        if (addedPages > 0) {
          pdf.addPage();
        }

        pdf.addImage(dataUrl, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);
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
    toast.success("Brochure PDF downloaded successfully!", { id: toastId });
  } catch (err) {
    console.error("PDF generation failed:", err);
    // Fallback: open 1st image URL in browser
    window.open(urls[0], '_blank');
    toast.dismiss(toastId);
  }
};
