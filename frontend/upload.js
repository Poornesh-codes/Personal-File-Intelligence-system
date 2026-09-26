// ========================================
// FILEMIND - UPLOAD SYSTEM
// ========================================

// HTML elements
const dropArea = document.getElementById("dropArea");
const browseButton = document.getElementById("browseButton");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const fileCount = document.getElementById("fileCount");
const uploadFilesButton =
    document.getElementById("uploadFilesButton");
const message = document.getElementById("message");

// Store selected files
let selectedFiles = [];


// ========================================
// BROWSE FILES
// ========================================

browseButton.addEventListener("click", function () {
    fileInput.click();
});


fileInput.addEventListener("change", function () {

    const files = Array.from(fileInput.files);

    addFiles(files);

});


// =======================================
// DRAG AND DROP
// ========================================

dropArea.addEventListener("dragover", function (event) {

    event.preventDefault();

    dropArea.classList.add("dragover");

});


dropArea.addEventListener("dragleave", function () {

    dropArea.classList.remove("dragover");

});


dropArea.addEventListener("drop", function (event) {

    event.preventDefault();

    dropArea.classList.remove("dragover");

    const files =
        Array.from(event.dataTransfer.files);

    addFiles(files);

});


// ========================================
// ADD FILES
// ========================================

function addFiles(files) {

    files.forEach(function (file) {

        if (!isValidFile(file)) {

            showMessage(
                file.name +
                " is not supported. Please select PDF, DOCX or TXT."
            );

            return;

        }


        // Check duplicate
        const alreadyExists =
            selectedFiles.some(function (existingFile) {

                return (
                    existingFile.name === file.name &&
                    existingFile.size === file.size
                );

            });


        if (!alreadyExists) {

            selectedFiles.push(file);

        }

    });


    displayFiles();

}


// ========================================
// FILE VALIDATION
// ========================================

function isValidFile(file) {

    const allowedExtensions = [
        ".pdf",
        ".docx",
        ".txt"
    ];


    const fileName =
        file.name.toLowerCase();


    return allowedExtensions.some(function (extension) {

        return fileName.endsWith(extension);

    });

}

// message
function showMessage(text, type = "info") {
    message.textContent = text;
    message.className = `message ${type}`;
}
// ========================================
// DISPLAY FILES
// ========================================

function displayFiles() {

    fileList.innerHTML = "";


    if (selectedFiles.length === 0) {

        fileList.innerHTML = `
            <div class="empty-message">
                No files selected yet.
            </div>
        `;

        uploadFilesButton.disabled = true;

        fileCount.textContent = "0 files";

        return;

    }


    selectedFiles.forEach(function (file, index) {

        const extension =
            getExtension(file.name);

        const fileSize =
            formatFileSize(file.size);


        const fileItem =
            document.createElement("div");

        fileItem.className = "file-item";


        fileItem.innerHTML = `

            <div class="file-type ${extension}">
                ${extension.toUpperCase()}
            </div>

            <div class="file-details">

                <h3>${file.name}</h3>

                <p>${fileSize}</p>

            </div>

            <button
                class="remove-file"
                onclick="removeFile(${index})"
            >
                ✕
            </button>

        `;


        fileList.appendChild(fileItem);

    });


    uploadFilesButton.disabled = false;


    fileCount.textContent =
        selectedFiles.length +
        (selectedFiles.length === 1
            ? " file"
            : " files");

}


// ========================================
// GET EXTENSION
// ========================================

function getExtension(fileName) {

    const parts =
        fileName.split(".");

    return parts[parts.length - 1]
        .toLowerCase();

}


// ========================================
// REMOVE FILE
// ========================================

function removeFile(index) {

    selectedFiles.splice(index, 1);

    displayFiles();

}


// ========================================
// FILE SIZE
// ========================================

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return bytes + " Bytes";

    }


    if (bytes < 1024 * 1024) {

        return (
            bytes / 1024
        ).toFixed(2) + " KB";

    }


    return (
        bytes / (1024 * 1024)
    ).toFixed(2) + " MB";

}


// ========================================
// UPLOAD DOCUMENTS
// ========================================

uploadFilesButton.addEventListener(
    "click",
    function () {

        if (selectedFiles.length === 0) {

            return;

        }


        startUploadProcess();

    }
);


// ========================================
// UPLOAD PROCESS
// ========================================

async function startUploadProcess() {
    const token = localStorage.getItem("token");

    if (!token) {
        showMessage("Please login before uploading files.", "error");
        return;
    }

    uploadFilesButton.disabled = true;

    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            await processFile(selectedFiles[i], i);
        }

        finishUpload();

    } catch (error) {
        console.error(error);

        showMessage(
            error.message || "Upload failed",
            "error"
        );

        uploadFilesButton.disabled = false;
    }
}



// ========================================
// PROCESS FILE
// ========================================

async function processFile(file, index) {

    const totalFiles = selectedFiles.length;

    showMessage(
        `Uploading ${file.name} (${index + 1}/${totalFiles})...`,
        "info"
    );

    const formData = new FormData();

    formData.append("file", file);

    const token = localStorage.getItem("token");

    const response = await fetch(
        "http://localhost:5000/api/documents/upload",
        {
            method: "POST",

            headers: {
                Authorization: `Bearer ${token}`
            },

            body: formData
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || `Failed to upload ${file.name}`
        );
    }

    console.log(
        `Uploaded successfully: ${file.name}`,
        data
    );
}


// ========================================
// PROCESSING UI
// ========================================

function showProcessingUI(
    file,
    status,
    progress
) {

    fileList.innerHTML = `

        <div class="processing-card">

            <div class="processing-top">

                <div class="file-type ${getExtension(file.name)}">
                    ${getExtension(file.name).toUpperCase()}
                </div>

                <div class="processing-info">

                    <h3>${file.name}</h3>

                    <p>${status}</p>

                </div>

                <strong>${progress}%</strong>

            </div>


            <div class="progress-background">

                <div
                    class="progress-bar"
                    style="width: ${progress}%"
                ></div>

            </div>

        </div>

    `;

}


// ========================================
// FINISH
// ========================================

function finishUpload() {

    fileList.innerHTML = `

        <div class="success-card">

            <div class="success-icon">
                ✓
            </div>

            <div>

                <h3>
                    Documents processed successfully!
                </h3>

                <p>
                    Your documents are now ready
                    for search and AI analysis.
                </p>

            </div>

        </div>

    `;


    showMessage(
        "All documents are ready to use."
    );


    // Clear selected files
    selectedFiles = [];


    fileCount.textContent = "Completed";


    // Re-enable controls
    browseButton.disabled = false;

    fileInput.disabled = false;

}