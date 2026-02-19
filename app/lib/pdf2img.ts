export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
  }
  
  let pdfjsLib: any = null;
  let isLoading = false;
  let loadPromise: Promise<any> | null = null;
  
  async function loadPdfJs(): Promise<any> {     
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;
  
    isLoading = true;
    // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
    loadPromise = import("pdfjs-dist/build/pdf.mjs")
      .then(async (lib) => {
        // Use CDN worker that matches the installed version (5.4.624)
        // This ensures version compatibility
        lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`;
        pdfjsLib = lib;
        isLoading = false;
        return lib;
      })
      .catch((err) => {
        isLoading = false;
        loadPromise = null;
        throw new Error(`Failed to load PDF.js library: ${err instanceof Error ? err.message : String(err)}`);
      });
  
    return loadPromise;
  }
  
  export async function convertPdfToImage(
    file: File
  ): Promise<PdfConversionResult> {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || typeof document === "undefined") {
        return {
          imageUrl: "",
          file: null,
          error: "PDF conversion requires a browser environment",
        };
      }

      // Load PDF.js library
      let lib;
      try {
        lib = await loadPdfJs();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          imageUrl: "",
          file: null,
          error: `Failed to load PDF.js: ${errorMessage}`,
        };
      }

      // Read file as array buffer
      let arrayBuffer;
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          imageUrl: "",
          file: null,
          error: `Failed to read PDF file: ${errorMessage}`,
        };
      }

      // Load PDF document
      let pdf;
      try {
        pdf = await lib.getDocument({ data: arrayBuffer }).promise;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          imageUrl: "",
          file: null,
          error: `Failed to load PDF document: ${errorMessage}`,
        };
      }

      // Get first page
      let page;
      try {
        page = await pdf.getPage(1);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          imageUrl: "",
          file: null,
          error: `Failed to get PDF page: ${errorMessage}`,
        };
      }

      // Create canvas and render
      try {
        const viewport = page.getViewport({ scale: 4 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
  
        if (!context) {
          return {
            imageUrl: "",
            file: null,
            error: "Failed to get canvas context",
          };
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
  
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
  
        await page.render({ canvasContext: context, viewport }).promise;
  
        return new Promise((resolve) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create a File from the blob with the same name as the pdf
                const originalName = file.name.replace(/\.pdf$/i, "");
                const imageFile = new File([blob], `${originalName}.png`, {
                  type: "image/png",
                });
  
                resolve({
                  imageUrl: URL.createObjectURL(blob),
                  file: imageFile,
                });
              } else {
                resolve({
                  imageUrl: "",
                  file: null,
                  error: "Failed to create image blob from canvas",
                });
              }
            },
            "image/png",
            1.0
          );
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          imageUrl: "",
          file: null,
          error: `Failed to render PDF page: ${errorMessage}`,
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        imageUrl: "",
        file: null,
        error: `Failed to convert PDF: ${errorMessage}`,
      };
    }
  }