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


// ========================================
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

function startUploadProcess() {

    // Disable controls
    uploadFilesButton.disabled = true;
    browseButton.disabled = true;

    fileInput.disabled = true;


    // Process each file
    processFile(0);

}


// ========================================
// PROCESS FILE
// ========================================

function processFile(index) {

    if (index >= selectedFiles.length) {

        finishUpload();

        return;

    }


    const file =
        selectedFiles[index];


    showProcessingUI(
        file,
        "Uploading document...",
        20
    );


    // Step 1
    setTimeout(function () {

        showProcessingUI(
            file,
            "Uploading document...",
            45
        );

    }, 700);


    // Step 2
    setTimeout(function () {

        showProcessingUI(
            file,
            "Extracting text...",
            65
        );

    }, 1400);


    // Step 3
    setTimeout(function () {

        showProcessingUI(
            file,
            "Indexing document...",
            85
        );

    }, 2100);


    // Step 4
    setTimeout(function () {

        showProcessingUI(
            file,
            "Document ready ✓",
            100
        );

    }, 2800);


    // Process next file
    setTimeout(function () {

        processFile(index + 1);

    }, 3300);

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