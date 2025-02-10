"use strict";

; (async () => {

    const video = document.querySelector("video");
    const viewport = document.getElementById("viewport");
    const imageCanvas = document.querySelector("canvas#image");
    const streamCanvas = document.querySelector("canvas#stream");

    const buttons = document.querySelectorAll("button");
    const swap = document.querySelector("button#swap");
    const captureDown = document.querySelector("button#captureDown");
    const captureUp = document.querySelector("button#captureUp");
    const captureLeft = document.querySelector("button#captureLeft");
    const captureRight = document.querySelector("button#captureRight");
    const clearBtn = document.querySelector("button#clear");

    const imageContext = imageCanvas.getContext("2d");
    const streamContext = streamCanvas.getContext("2d", { willReadFrequently: true });

    let wWidth, wHeight;
    let vWidth, vHeight;

    const updateViewport = () => {
        const viewportRect = viewport.getBoundingClientRect();
        wWidth = imageCanvas.width = streamCanvas.width = viewportRect.width;
        wHeight = imageCanvas.height = streamCanvas.height = viewportRect.height;
        // console.log("viewport", wWidth, wHeight);
    }

    updateViewport();
    window.onresize = updateViewport;

    const disableButtons = () => buttons.forEach(b => b.disabled = true);
    const enableButtons = () => buttons.forEach(b => b.disabled = false);

    // Disable buttons until camera is initialized
    disableButtons();

    await navigator.permissions.query({ name: "camera" });

    let facingMode = "user";
    const switchFacingMode = () => {
        facingMode = facingMode === "user" ? "environment" : "user";
    }

    const initCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices
                .getUserMedia({ video: { facingMode } });

            video.srcObject = mediaStream;
            video.onloadedmetadata = () => video.play();

            vWidth = mediaStream.getVideoTracks()[0].getSettings().width;
            vHeight = mediaStream.getVideoTracks()[0].getSettings().height;
            // console.log("video size", vWidth, vHeight);
        }
        catch (err) {
            alert("Unable to open camera");
            throw err;
        }
    }

    const streamVideo = () => {
        const sAspect = vWidth / vHeight;
        const dAspect = wWidth / wHeight;

        // Scale to fill viewport
        const sWidth = Math.min(vWidth, vWidth * dAspect / sAspect);
        const sx = (vWidth - sWidth) / 2;
        const sHeight = Math.min(vHeight, vHeight * sAspect / dAspect);
        const sy = (vHeight - sHeight) / 2;

        streamContext.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, wWidth, wHeight);

        // Flip camera to get mirror effect in portrait mode
        if (facingMode === "user") {
            const mirrored = flipVertically(streamContext.getImageData(0, 0, wWidth, wHeight));
            streamContext.putImageData(mirrored, 0, 0);
        }

        requestAnimationFrame(streamVideo);
    }

    const flipVertically = (imageData) => {
        const data = new Uint8ClampedArray(imageData.data.length);
        const width = imageData.width;
        const height = imageData.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const x2 = width - x - 1;

                data[(y * width + x) * 4] = imageData.data[(y * width + x2) * 4];
                data[(y * width + x) * 4 + 1] = imageData.data[(y * width + x2) * 4 + 1];
                data[(y * width + x) * 4 + 2] = imageData.data[(y * width + x2) * 4 + 2];
                data[(y * width + x) * 4 + 3] = imageData.data[(y * width + x2) * 4 + 3];
            }
        }

        return new ImageData(data, width, height);
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const capture = async (direction) => {
        disableButtons();

        try {
            imageContext.clearRect(0, 0, wWidth, wHeight);
            imageContext.fillStyle = "#ffffff";

            if (direction === "down") {
                for (let line = 0; line < wHeight; line++) {
                    const imageData = streamContext.getImageData(0, line, wWidth, 1);
                    imageContext.fillRect(0, line, wWidth, 2);
                    imageContext.putImageData(imageData, 0, line);
                    await sleep(10);
                }
            }

            if (direction === "up") {
                for (let line = wHeight - 1; line >= 0; line--) {
                    const imageData = streamContext.getImageData(0, line, wWidth, 1);
                    imageContext.fillRect(0, line - 1, wWidth, 2);
                    imageContext.putImageData(imageData, 0, line);
                    await sleep(10);
                }
            }

            if (direction === "right") {
                for (let line = 0; line < wWidth; line++) {
                    const imageData = streamContext.getImageData(line, 0, 1, wHeight);
                    imageContext.fillRect(line, 0, 2, wHeight);
                    imageContext.putImageData(imageData, line, 0);
                    await sleep(10);
                }
            }

            if (direction === "left") {
                for (let line = wWidth - 1; line >= 0; line--) {
                    const imageData = streamContext.getImageData(line, 0, 1, wHeight);
                    imageContext.fillRect(line - 1, 0, 2, wHeight);
                    imageContext.putImageData(imageData, line, 0);
                    await sleep(10);
                }
            }
        } finally {
            enableButtons();
        }
    }

    const clear = () => {
        imageContext.clearRect(0, 0, wWidth, wHeight);
    }

    await initCamera();

    streamVideo();
    enableButtons();

    swap.addEventListener("click", async () => {
        switchFacingMode();
        initCamera();
        viewport.className = viewport.className ? "" : "swap";
    });
    captureDown.addEventListener("click", () => capture("down"));
    captureUp.addEventListener("click", () => capture("up"));
    captureLeft.addEventListener("click", () => capture("left"));
    captureRight.addEventListener("click", () => capture("right"));
    clearBtn.addEventListener("click", clear);
})();
