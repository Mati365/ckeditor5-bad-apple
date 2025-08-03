export function prerenderBadApple(config: PrerenderBadAppleConfig): Promise<ArrayBuffer[]> {
  const { width, height, sampleRate, maxLength } = config;

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = "/bad-apple.mp4";
    video.muted = true;

    // Hide video
    video.style.display = "none";
    document.body.appendChild(video);

    const canvas = document.createElement("canvas");
    const videoWidth = 480;
    const videoHeight = 360;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      document.body.removeChild(video);
      return reject(new Error("Cannot get 2D context from canvas."));
    }

    const frames: ArrayBuffer[] = [];
    const frameInterval = sampleRate / 1000;

    video.addEventListener("loadedmetadata", () => {
      console.log("Video metadata loaded, duration:", video.duration, "s");

      const duration = maxLength > 0 ? Math.min(maxLength, video.duration) : video.duration;
      let currentTime = 0;

      const processFrame = () => {
        console.log("Processing frame at time:", currentTime, "s");

        if (currentTime > duration) {
          document.body.removeChild(video);
          resolve(frames);
          return;
        }

        video.currentTime = currentTime;
      };

      video.addEventListener("seeked", () => {
        // Draw frame on canvas
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);
        const data = imageData.data;

        // Prepare buffer for new frame
        const frameSizeInBytes = Math.ceil((width * height) / 8);
        const frameBuffer = new ArrayBuffer(frameSizeInBytes);
        const frameView = new Uint8Array(frameBuffer);

        const regionWidth = videoWidth / width;
        const regionHeight = videoHeight / height;

        // Process each region
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let totalBrightness = 0;
            let pixelCount = 0;

            const startX = Math.floor(x * regionWidth);
            const endX = Math.floor((x + 1) * regionWidth);
            const startY = Math.floor(y * regionHeight);
            const endY = Math.floor((y + 1) * regionHeight);

            // Calculate average brightness in region
            for (let sy = startY; sy < endY; sy++) {
              for (let sx = startX; sx < endX; sx++) {
                const i = (sy * videoWidth + sx) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Simple grayscale conversion
                const brightness = (r + g + b) / 3;
                totalBrightness += brightness;
                pixelCount++;
              }
            }

            const avgBrightness = totalBrightness / pixelCount;

            // Set bit based on brightness threshold
            if (avgBrightness > 127) {
              const bitIndex = y * width + x;
              const byteIndex = Math.floor(bitIndex / 8);
              const bitInByte = bitIndex % 8;
              frameView[byteIndex] |= 1 << bitInByte;
            }
          }
        }

        frames.push(frameBuffer);
        currentTime += frameInterval;

        // Move to next frame
        if (frames.length < (duration / frameInterval)) {
          requestAnimationFrame(processFrame);
        } else {
          document.body.removeChild(video);
          resolve(frames);
        }
      });

      video.addEventListener("error", (e) => {
        document.body.removeChild(video);
        reject(new Error(`Video loading error: ${e.message || "Unknown error"}`));
      });

      // Start processing
      processFrame();
    });

    // Handle error if video couldn't be loaded
    video.addEventListener("error", () => {
      document.body.removeChild(video);
      reject(new Error("Cannot load video."));
    });
  });
}

export type PrerenderBadAppleConfig = {
  width: number;
  height: number;
  sampleRate: number;
  maxLength: number;
};
