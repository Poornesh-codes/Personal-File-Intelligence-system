const API_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", () => {
    loadUser();
    loadDocuments();
});




function loadUser() {

    const userData = localStorage.getItem("user");

    if (!userData) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(userData);

    const profileName =
        document.getElementById("profileName");

    const profileAvatar =
        document.getElementById("profileAvatar");

    const welcomeMessage =
        document.getElementById("welcomeMessage");


    // Display user's name
    profileName.textContent = user.name;


    // Display first letter of name
    profileAvatar.textContent =
        user.name.charAt(0).toUpperCase();


    // Welcome message
    welcomeMessage.textContent =
        `Welcome back, ${user.name} 👋`;
}



/* =========================
   LOAD DOCUMENTS
========================= */

async function loadDocuments() {

    const token =
        localStorage.getItem("token");


    // User is not logged in
    if (!token) {
        window.location.href = "login.html";
        return;
    }


    const documentsList =
        document.getElementById("documentsList");


    try {

        const response = await fetch(
            `${API_URL}/api/documents`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        console.log("Documents API response:", data);


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load documents"
            );

        }


        displayDocuments(
            data.documents || []
        );


        updateStatistics(
            data.documents || []
        );


    } catch (error) {

        console.error(
            "Document loading error:",
            error
        );


        documentsList.innerHTML = `
            <p>
                Unable to load documents.
            </p>
        `;
    }
}



/* =========================
   DISPLAY DOCUMENTS
========================= */

function displayDocuments(files) {

    const documentsList =
        document.getElementById("documentsList");


    // No documents
    if (!files || files.length === 0) {

        documentsList.innerHTML = `
            <p>
                No documents uploaded yet.
            </p>
        `;

        return;
    }


    // Clear existing documents
    documentsList.innerHTML = "";


    // Show only the 4 most recent documents
    const recentFiles =
        files.slice(0, 4);


    recentFiles.forEach((file) => {

        const card =
            createDocumentCard(file);

        documentsList.appendChild(card);

    });
}






function createDocumentCard(file) {

    const card =
        document.createElement("div");


    card.className =
        "document-card";


    /*
        Get extension

        Example:
        AR_FurnitureTryOn_Report.pdf

        becomes:

        PDF
    */

    const fileName =
        file.originalName || "Unknown file";


    const extension =
        fileName.includes(".")
            ? fileName
                .split(".")
                .pop()
                .toUpperCase()
            : "FILE";


    const fileType =
        extension.toLowerCase();


    card.innerHTML = `

        <div class="file-icon ${fileType}">
            ${extension}
        </div>


        <div class="file-info">

            <h3>
                ${fileName}
            </h3>


            <p>
                ${formatFileSize(file.fileSize)}
                •
                ${formatDate(file.createdAt)}
            </p>

        </div>


        <div class="file-tag">
            ${extension}
        </div>


        <button
            class="more-button"
            type="button"
        >
            ⋮
        </button>

    `;


    /*
        Open document when card is clicked
    */

    card.addEventListener("click", () => {
        openDocument(file._id, card);
    });
    const moreButton =
    card.querySelector(".more-button");


    moreButton.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteDocument(file._id, card);
    });


    return card;
}



async function openDocument(documentId, card) {

    const token =
        localStorage.getItem("token");


    if (!token) {
        window.location.href = "login.html";
        return;
    }


    /*
        Show clicked state
    */

    card.classList.add("document-opening");


    /*
        Save the original card information
    */

    const fileInfo =
        card.querySelector(".file-info");

    const originalInfo =
        fileInfo.innerHTML;


    /*
        Show loading message
    */

    fileInfo.innerHTML = `
        <h3>Opening document...</h3>
        <p>Please wait...</p>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/api/documents/${documentId}/file`,
                {
                    method: "GET",

                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {

            const data =
                await response.json();

            throw new Error(
                data.message ||
                "Unable to open document"
            );
        }


        /*
            Convert response to Blob
        */

        const blob =
            await response.blob();


        /*
            Create temporary browser URL
        */

        const fileURL =
            URL.createObjectURL(blob);


        /*
            Open document
        */

        window.open(
            fileURL,
            "_blank"
        );


        /*
            Restore card after opening
        */

        setTimeout(() => {

            card.classList.remove(
                "document-opening"
            );

            fileInfo.innerHTML =
                originalInfo;

        }, 700);


        /*
            Clean up temporary URL
        */

        setTimeout(() => {
            URL.revokeObjectURL(fileURL);
        }, 60000);


    } catch (error) {

        console.error(
            "Open document error:",
            error
        );


        /*
            Restore card if something failed
        */

        card.classList.remove(
            "document-opening"
        );

        fileInfo.innerHTML =
            originalInfo;


        alert(
            error.message ||
            "Unable to open document"
        );

    }

}


async function deleteDocument(documentId, card) {

    const token =
        localStorage.getItem("token");


    if (!token) {
        window.location.href = "login.html";
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this document?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/documents/${documentId}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to delete document"
            );

        }


        /*
            Remove card from UI
        */

        card.remove();


        /*
            Reload documents/statistics
            so file count and storage update.
        */

        loadDocuments();


    } catch (error) {

        console.error(
            "Delete document error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete document"
        );

    }

}



function updateStatistics(files) {

    const totalFiles =
        document.getElementById("totalFiles");


    const storageUsed =
        document.getElementById("storageUsed");


    /*
        Total number of files
    */

    totalFiles.textContent =
        files.length;


    /*
        Calculate total storage
    */

    const totalBytes =
        files.reduce(
            (total, file) => {

                return total +
                    (Number(file.fileSize) || 0);

            },
            0
        );


    storageUsed.textContent =
        formatFileSize(totalBytes);
}



/* =========================
   FORMAT FILE SIZE
========================= */

function formatFileSize(bytes) {

    bytes =
        Number(bytes) || 0;


    if (bytes === 0) {
        return "0 Bytes";
    }


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    const size =
        bytes /
        Math.pow(1024, index);


    return (
        parseFloat(
            size.toFixed(2)
        ) +
        " " +
        units[index]
    );
}



function formatDate(dateString) {

    if (!dateString) {
        return "Unknown date";
    }


    const date =
        new Date(dateString);


    const now =
        new Date();


    const difference =
        now - date;


    const days =
        Math.floor(
            difference /
            (1000 * 60 * 60 * 24)
        );


    if (days === 0) {
        return "Uploaded today";
    }


    if (days === 1) {
        return "Uploaded yesterday";
    }


    return `Uploaded ${days} days ago`;
}
