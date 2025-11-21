/* -----------------------------------------------
   SISTEMA DE REMOÇÃO DE FUNDO COM IA (MEDIAPIPE)
-------------------------------------------------*/

let stream = null;
let capturedImage = null;
let noseColor = "#ff6b6b";
let processedImageData = null;

// Elementos do DOM
const cameraPreview = document.getElementById("cameraPreview");
const resultPreview = document.getElementById("resultPreview");
const captureBtn = document.getElementById("captureBtn");
const retakeBtn = document.getElementById("retakeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const noseIndicator = document.getElementById("noseIndicator");
const colorSample = document.getElementById("colorSample");
const colorCode = document.getElementById("colorCode");
const loading = document.getElementById("loading");
const uploadGitHubBtn = document.getElementById("uploadGitHubBtn");
uploadGitHubBtn.addEventListener("click", uploadToGitHub);
const goGalleryBtn = document.getElementById('goGalleryBtn');
goGalleryBtn.addEventListener('click', () => {
  window.location.href = 'cartela_cores.html';
});

/* -------------------------------
   INICIAR CÂMERA
---------------------------------*/
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
				facingMode: "user",
				width: { ideal: 720 },
				height: { ideal: 720 },
				aspectRatio: 1 }
		});

        cameraPreview.srcObject = stream;
        cameraPreview.style.display = "block";
        resultPreview.style.display = "none";

    } catch (err) {
        alert("Erro ao acessar a câmera: " + err.message);
    }
}

/* -------------------------------
   CAPTURAR FOTO
---------------------------------*/
function captureImage() {
    const canvas = document.createElement("canvas");
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(cameraPreview, 0, 0);

    capturedImage = canvas.toDataURL("image/png");
    processImage();

}

/* -------------------------------
   PROCESSAR FOTO
---------------------------------*/
async function processImage() {
    if (!capturedImage) return;

    loading.style.display = "block";
    captureBtn.style.display = "none";

    const img = new Image();
    img.onload = async function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        // Pegar cor do nariz (centro da imagem)
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;

        noseColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
        colorSample.style.backgroundColor = noseColor;
        colorCode.textContent = noseColor;

       /* // ?? Remove fundo de verdade (IA)
        const finalCanvas = await removeBackgroundWithAI(img, noseColor);

        // Gera o dataURL só quando o canvas está pronto
        const finalDataUrl = finalCanvas.toDataURL("image/png");

        processedImageData = finalDataUrl;
        showResult(finalDataUrl);*/
		
		const finalCanvas = await removeBackgroundWithAI(img, noseColor);

		// OBS: finalCanvas já teve a legenda desenhada dentro de removeBackgroundWithAI()
		processedImageData = finalCanvas.toDataURL("image/png");

		// agora exibe o resultado (showResult desenha o processedImageData no canvas visível)
		showResult(processedImageData);


        loading.style.display = "none";
        retakeBtn.style.display = "flex";
        downloadBtn.style.display = "flex";
		uploadGitHubBtn.style.display = "flex";

    };

    img.src = capturedImage;
}
/* ------------------ 
ADICIONAR LEGENDA 
------------------- 
function addCaption(ctx, color, width, height) {
    const text = `${color}`;
    ctx.font = 'bold 40px monospace';

    const textWidth = ctx.measureText(text).width;

    // Posição canto inferior esquerdo
    const x = 20;
    const y = height - 20;

    // Fundo preto da legenda
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x - 10, y - 32, textWidth + 20, 40);

    // Texto branco
    ctx.fillStyle = 'white';
    ctx.fillText(text, x, y);
}*/

function drawCaption(ctx, color, width, height) {
    const text = color.toUpperCase();
    const padding = 20;
    ctx.font = 'bold 40px monospace';
    ctx.textBaseline = 'bottom';
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + padding * 2;
    const boxH = 56;
    const x = 18;
    const y = height - 18;

    // fundo arredondado (preto semi-transparente)
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    // desenha retângulo arredondado
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(x + r, y - boxH);
    ctx.arcTo(x + boxW, y - boxH, x + boxW, y, r);
    ctx.arcTo(x + boxW, y, x, y, r);
    ctx.arcTo(x, y, x, y - boxH, r);
    ctx.arcTo(x, y - boxH, x + boxW, y - boxH, r);
    ctx.closePath();
    ctx.fill();

    // texto
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x + padding, y - 8);
}

/* -------------------------------------------------
   ?? REMOÇÃO REAL DE FUNDO – MediaPipe Selfie Segmentation
---------------------------------------------------
async function removeBackgroundWithAI(image, bgColor) {
    return new Promise(async (resolve) => {

        const segmentation = new SelfieSegmentation({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });

        segmentation.setOptions({
            modelSelection: 1
        });

        segmentation.onResults((results) => {
            const w = image.width;
            const h = image.height;

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext("2d");

            // Máscara de segmentação (onde é pessoa)
            ctx.drawImage(results.segmentationMask, 0, 0, w, h);

            // Fundo sólido
            const hex = bgColor.replace("#", "");
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            ctx.globalCompositeOperation = "source-out";
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(0, 0, w, h);

            // Pessoa por cima
            ctx.globalCompositeOperation = "destination-over";
            ctx.drawImage(results.image, 0, 0, w, h);

            resolve(canvas);
			
        });

        await segmentation.send({ image });
    });
}*/

async function removeBackgroundWithAI(image, bgColor) {
    return new Promise(async (resolve, reject) => {
        try {
            const segmentation = new SelfieSegmentation({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
            });
            segmentation.setOptions({ modelSelection: 1 });

            segmentation.onResults((results) => {
                try {
                    const w = image.width;
                    const h = image.height;
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');

                    // desenha máscara e composições (mesma lógica sua)
                    ctx.drawImage(results.segmentationMask, 0, 0, w, h);

                    const hex = bgColor.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);

                    ctx.globalCompositeOperation = 'source-out';
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.fillRect(0, 0, w, h);

                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.drawImage(results.image, 0, 0, w, h);

                    ctx.globalCompositeOperation = 'source-over';

                    // ==== AQUI: desenha a legenda NO MESMO CANVAS FINAL ====
                    drawCaption(ctx, bgColor, w, h);

                    // resolve apenas depois de desenhar a legenda
                    resolve(canvas);
                } catch (errInner) {
                    reject(errInner);
                }
            });

            // envia uma versão redimensionada para estabilidade, mas usamos a `results.image` para desenhar no tamanho final
            const small = document.createElement('canvas');
            const MAX = 720;
            const scale = Math.min(1, MAX / image.width);
            small.width = Math.max(128, Math.floor(image.width * scale));
            small.height = Math.max(128, Math.floor(image.height * scale));
            small.getContext('2d').drawImage(image, 0, 0, small.width, small.height);

            await segmentation.send({ image: small });
        } catch (err) {
            reject(err);
        }
    });
}



/* -------------------------------
   EXIBIR RESULTADO
---------------------------------*/
function showResult(dataUrl) {
    cameraPreview.style.display = "none";
    resultPreview.style.display = "block";
    //resultPreview.src = dataUrl;
    //noseIndicator.style.display = "none";
	
	 // CORREÇÃO: Desenhar a imagem no canvas
    const ctx = resultPreview.getContext('2d');
    const img = new Image();
	
    img.onload = function() {
       // resultPreview.width = img.width;
       // resultPreview.height = img.height;
       // ctx.drawImage(img, 0, 0);
	   
		const MAX_WIDTH = 800;
	   	let finalWidth, finalHeight;
		
		if (img.width > MAX_WIDTH) {
			const ratio = img.height / img.width;
			finalWidth = MAX_WIDTH;
			finalHeight = MAX_WIDTH * ratio;
		} else {
		finalWidth = img.width;
		finalHeight = img.height;
		}

		resultPreview.width = finalWidth;
		resultPreview.height = finalHeight;

		const ctx = resultPreview.getContext("2d");
		ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
		
		 // Desenha a imagem final
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        // ---------- ADICIONAR LEGENDA ----------
        //addCaption(ctx, noseColor, finalWidth, finalHeight);
        // ----------------------------------------
    };
    img.src = dataUrl;
    
    noseIndicator.style.display = "none";
	
}async function uploadToGitHub() {
    if (!processedImageData) return alert("Tire uma foto primeiro.");

    const fileBase64 = processedImageData.split(",")[1];
    const fileName = "foto_" + Date.now() + ".png";

    // 🔗 SUA URL DO WORKER AQUI
    const workerUrl = "https://tons-upload.jamps-fernandes.workers.dev/";

    try {
        const response = await fetch(workerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileContent: fileBase64,
                fileName: fileName
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Erro do Worker:", text);
            alert("Erro ao enviar: " + text);
            return;
        }

        alert("Imagem enviada com sucesso ao GitHub!");

    } catch (error) {
        console.error(error);
        alert("Falha ao conectar ao servidor.");
    }
}


/* -------------------------------
   BAIXAR IMAGEM
---------------------------------*/
function downloadImage() {
    if (!processedImageData) return alert("Tire uma foto primeiro.");
    const link = document.createElement("a");
    link.download = "foto-processada.png";
    link.href = processedImageData;
    link.click();
}

/* -------------------------------
   REFAZER FOTO
---------------------------------*/
function retakePhoto() {
    if (stream) stream.getTracks().forEach((t) => t.stop());

    cameraPreview.style.display = "block";
    resultPreview.style.display = "none";
    resultPreview.src = "";

    noseIndicator.style.display = "block";
    colorSample.style.backgroundColor = "";
    colorCode.textContent = "#------";

    captureBtn.style.display = "flex";
    retakeBtn.style.display = "none";
    downloadBtn.style.display = "none";

    startCamera();
}

/* -------------------------------
   UTILITÁRIO: RGB ? HEX
---------------------------------*/
function rgbToHex(r, g, b) {
    return (
        "#" +
        ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()
    );
}

/* -------------------------------
   EVENTOS
---------------------------------*/
captureBtn.addEventListener("click", captureImage);
retakeBtn.addEventListener("click", retakePhoto);
downloadBtn.addEventListener("click", downloadImage);

window.addEventListener("load", startCamera);

