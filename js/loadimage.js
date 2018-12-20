'use strict';

function uploadFileFromInput(event) {
    hideItem(errorNode);
    const input = document.createElement('input');
    input.setAttribute('id', 'fileInput');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg, image/png');
    hideItem(input);
    menu.appendChild(input);
    document.querySelector('#fileInput').addEventListener('change', event => {
        const files = Array.from(event.currentTarget.files);

        if (currentImage.dataset.load === 'load') {
            removeForm();
            curves = [];
        }

        sendFile(files);
    });

    input.click();
    menu.removeChild(input);
}

function onFilesDrop(event) {
    event.preventDefault();
    hideItem(errorNode);
    const files = Array.from(event.dataTransfer.files);

    if (currentImage.dataset.load === 'load') {
        showItem(errorNode);
        errorNode.lastElementChild.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню';
        errorRemove();
        return;
    }

    files.forEach(file => {
        if ((file.type === 'image/jpeg') || (file.type === 'image/png')) {
            sendFile(files);
        } else {
            showItem(errorNode)
        }
    });
}

function sendFile(files) {
    const formData = new FormData();

    files.forEach(file => {
        const fileTitle = delExtension(file.name);
        formData.append('title', fileTitle);
        formData.append('image', file);
    });

    showItem(imageLoader);

    fetch(`${urlApi}/pic`, {
            body: formData,
            credentials: 'same-origin',
            method: 'POST'
        })
        .then(res => {
            if (res.status >= 200 && res.status < 300) {
                return res;
            }
            throw new Error(res.statusText);
        })
        .then(res => res.json())
        .then(res => {
            getImageData(res.id);
        })
        .catch(er => {
            console.log(er);
            hideItem(imageLoader);
        });
}

function removeForm() {
    const formComment = wrap.querySelectorAll('.comments__form');
    Array.from(formComment).forEach(item => {
        item.remove()
    });
}

function getImageData(id) {
    const xhrGetInfo = new XMLHttpRequest();
    xhrGetInfo.open(
        'GET',
        `${urlApi}/pic/${id}`,
        false
    );
    xhrGetInfo.send();

    dataGetParse = JSON.parse(xhrGetInfo.responseText);
    curHost = `${window.location.origin}${window.location.pathname}?id=${dataGetParse.id}`;
    localStorage.curHost = curHost;
    wss();
    setcurrentImage(dataGetParse);
    burger.style.cssText = ``;
    history.pushState(null, null, curHost); 
    showMenuShare();
    currentImage.addEventListener('load', () => {
        hideItem(imageLoader);
        createWrapforCanvasComment();
        createCanvas();
        currentImage.dataset.load = 'load';
        updateCommentForm(dataGetParse.comments);
        minimizeAllCommentForms();
    });

}

function delExtension(inputText) {
    let regExp = new RegExp(/\.[^.]+$/gi);

    return inputText.replace(regExp, '');
}

function showMenuShare() {
    console.log('showMenuShare')
    menu.dataset.state = 'default';
    Array.from(menu.querySelectorAll('.mode')).forEach(modeItem => {
        if (!modeItem.classList.contains('share')) {
             menu.querySelector('.menu__url').value = curHost;
            return;
        }

        menu.dataset.state = 'selected';
        modeItem.dataset.state = 'selected';
    })
}
