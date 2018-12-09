'use strict';

const urlApi = 'https://neto-api.herokuapp.com';
const wrapCommentsCanvas = document.createElement('div');
const canvas = document.createElement('canvas');

const wrap = document.querySelector('.wrap');
const currentImage = document.querySelector('.current-image');

const menu = document.querySelector('.menu');
const burger = document.querySelector('.burger');
const comments = document.querySelector('.comments');
const draw = document.querySelector('.draw');
const share = document.querySelector('.share');
const menuUrl = document.querySelector('.menu__url');
const modeHTMLElements = document.querySelectorAll('.mode');
const copyButton = document.querySelector('.menu_copy');

const imageLoader = document.querySelector('.image-loader');
const errorMessage = document.querySelector('.error__message');
const errorNode = document.querySelector('.error');

const allCommentsForms = document.querySelectorAll('.comments__marker');

document.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', throttle(drag));
document.addEventListener('mouseup', drop);

let movedPiece = null;
let minY, minX, maxX, maxY;
let shiftX = 0;
let shiftY = 0;

function setcurrentImage(fileInfo) {
    currentImage.src = fileInfo.url;
}

function markerCheckboxOff() {
    const forms = document.querySelectorAll('.comments__form');
    Array.from(forms).forEach(form => {
        form.style.display = 'none';
    })
}

function markerCheckboxOn() {
    const forms = document.querySelectorAll('.comments__form');
    Array.from(forms).forEach(form => {
        form.style.display = '';
    })
}

function checkComment(event) {
    if (!(menu.querySelector('.comments').dataset.state === 'selected') || !wrap.querySelector('#comments-on').checked) {
        return;
    }
    wrapCommentsCanvas.appendChild(createCommentForm(event.offsetX, event.offsetY));

}

function createWrapforCanvasComment() {
    const width = getComputedStyle(wrap.querySelector('.current-image')).width;
    const height = getComputedStyle(wrap.querySelector('.current-image')).height;
    wrapCommentsCanvas.style.cssText = `
		width: ${width};
		height: ${height};
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: block;
	`;
    wrap.appendChild(wrapCommentsCanvas);

    wrapCommentsCanvas.addEventListener('click', event => {
        if (event.target.closest('form.comments__form')) {
            const curForm = event.target.closest('form.comments__form');
            Array.from(wrapCommentsCanvas.querySelectorAll('form.comments__form')).forEach(form => {
                form.style.zIndex = 2;
                if (form !== curForm) {
                    form.querySelector('.comments__marker-checkbox').checked = false;
                }

            });
            curForm.style.zIndex = 3;
            deleteAllBlankCommentFormsExcept(curForm);

        }
    });
}

function createCommentForm(x, y) {
    const formComment = document.createElement('form');
    formComment.classList.add('comments__form');
    formComment.innerHTML = `
		<span class="comments__marker"></span><input type="checkbox" class="comments__marker-checkbox">
		<div class="comments__body">
			<div class="comment">
				<div class="loader">
					<span></span>
					<span></span>
					<span></span>
					<span></span>
					<span></span>
				</div>
			</div>
			<textarea class="comments__input" type="text" placeholder="Напишите ответ..."></textarea>
			<input class="comments__close" type="button" value="Закрыть">
			<input class="comments__submit" type="submit" value="Отправить">
		</div>`;


    const left = x - 22;
    const top = y - 14;

    formComment.style.cssText = `
		top: ${top}px;
		left: ${left}px;
		z-index: 5;
	`;
    formComment.dataset.left = left;
    formComment.dataset.top = top;
    minimizeAllCommentForms(formComment);
    deleteAllBlankCommentFormsExcept(formComment)
    formComment.querySelector('.comments__marker-checkbox').checked = true;
    hideItem(formComment.querySelector('.loader').parentElement);

    formComment.querySelector('.comments__close').addEventListener('click', () => {
        if (formComment.querySelectorAll('.comment').length > 1) {
            formComment.querySelector('.comments__marker-checkbox').checked = false;
        } else {
            formComment.remove();
        }
    });

    formComment.addEventListener('submit', messageSend);
    formComment.querySelector('.comments__input').addEventListener('keydown', keySendMessage);

    function keySendMessage(event) {
        if (event.repeat) {
            return;
        }
        if (!event.ctrlKey) {
            return;
        }

        switch (event.code) {
            case 'Enter':
                messageSend();
                break;
        }
    }

    function messageSend(event) {
        if (event) {
            event.preventDefault();
        }
        const message = formComment.querySelector('.comments__input').value;
        const messageSend = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;
        commentsSend(messageSend);
        showItem(formComment.querySelector('.loader').parentElement);
        formComment.querySelector('.comments__input').value = '';
    }

    function commentsSend(message) {
        fetch(`${urlApi}/pic/${dataGetParse.id}/comments`, {
                method: 'POST',
                body: message,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
            })
            .then(res => {
                if (res.status >= 200 && res.status < 300) {
                    return res;
                }
                throw new Error(res.statusText);
            })
            .then(res => res.json())
            .catch(er => {
                console.log(er);
                formComment.querySelector('.loader').parentElement.style.display = 'none';
            });
    }

    return formComment;
}

function addMessageComment(message, form) {
    let parentLoaderDiv = form.querySelector('.loader').parentElement;

    const newMessageDiv = document.createElement('div');
    newMessageDiv.classList.add('comment');
    newMessageDiv.dataset.timestamp = message.timestamp;

    const commentTimeP = document.createElement('p');
    commentTimeP.classList.add('comment__time');
    commentTimeP.textContent = getDate(message.timestamp);
    newMessageDiv.appendChild(commentTimeP);

    const commentMessageP = document.createElement('p');
    const commentMessagePre = document.createElement('pre');
    commentMessageP.classList.add('comment__message');
    commentMessagePre.textContent = message.message;
    commentMessageP.appendChild(commentMessagePre);
    newMessageDiv.appendChild(commentMessageP);

    form.querySelector('.comments__body').insertBefore(newMessageDiv, parentLoaderDiv);
}

function updateCommentForm(newComment) {
    if (!newComment) return;
    Object.keys(newComment).forEach(id => {
        if (id in showComments) return;

        showComments[id] = newComment[id];
        let needCreateNewForm = true;

        Array.from(wrap.querySelectorAll('.comments__form')).forEach(form => {

            if (Number(form.dataset.left) === showComments[id].left && Number(form.dataset.top) === showComments[id].top) {
                form.querySelector('.loader').parentElement.style.display = 'none';
                addMessageComment(newComment[id], form);
                needCreateNewForm = false;
            }
        });

        if (needCreateNewForm) {
            const newForm = createCommentForm(newComment[id].left + 22, newComment[id].top + 14);
            newForm.dataset.left = newComment[id].left;
            newForm.dataset.top = newComment[id].top;
            newForm.style.left = newComment[id].left + 'px';
            newForm.style.top = newComment[id].top + 'px';
            wrapCommentsCanvas.appendChild(newForm);
            addMessageComment(newComment[id], newForm);

            if (!wrap.querySelector('#comments-on').checked) {
                newForm.style.display = 'none';
            }
        }
    });
}

function insertWssCommentForm(wssComment) {
    const wsCommentEdited = {};
    wsCommentEdited[wssComment.id] = {};
    wsCommentEdited[wssComment.id].left = wssComment.left;
    wsCommentEdited[wssComment.id].message = wssComment.message;
    wsCommentEdited[wssComment.id].timestamp = wssComment.timestamp;
    wsCommentEdited[wssComment.id].top = wssComment.top;
    updateCommentForm(wsCommentEdited);

}

function minimizeAllCommentForms(currentForm = null) {
    document.querySelectorAll('.comments__form').forEach(form => {
        if (form !== currentForm) {
            form.querySelector('.comments__marker-checkbox').checked = false;
        }
    });
}

function deleteAllBlankCommentFormsExcept(currentForm = null) {
    document.querySelectorAll('.comments__form').forEach(form => {
        if (form.querySelectorAll('.comment').length < 2 && form !== currentForm) {
            form.remove();
        }
    });
}


function getDate(timestamp) {
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const date = new Date(timestamp);
    const dateStr = date.toLocaleString('ru-RU', options);

    return dateStr.slice(0, 8) + dateStr.slice(9);
}

function dragStart(event) {
    if (!event.target.classList.contains('drag')) {
        return;
    }

    movedPiece = event.target.parentElement;
    minX = wrap.offsetLeft;
    minY = wrap.offsetTop;

    maxX = wrap.offsetLeft + wrap.offsetWidth - movedPiece.offsetWidth;
    maxY = wrap.offsetTop + wrap.offsetHeight - movedPiece.offsetHeight;

    shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
    shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
}

function drag(event) {
    if (!movedPiece) {
        return;
    }

    let x = event.pageX - shiftX;
    let y = event.pageY - shiftY;
    x = Math.min(x, maxX);
    y = Math.min(y, maxY);
    x = Math.max(x, minX);
    y = Math.max(y, minY);
    movedPiece.style.left = x + 'px';
    movedPiece.style.top = y + 'px';
}

function drop(event) {
    if (movedPiece) {
        movedPiece = null;
    }
}

function throttle(func, delay = 0) {
    let isWaiting = false;

    return function (...res) {
        if (!isWaiting) {
            func.apply(this, res);
            isWaiting = true;
            setTimeout(() => {
                isWaiting = false;
            }, delay);
        }
    }
}

function debounce(func, delay = 0) {
    let timeout;

    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            func();
        }, delay);
    };
}

const debounceSendMask = debounce(sendMaskState, 1000);
	
function createCanvas() {
    const width = getComputedStyle(wrap.querySelector('.current-image')).width.slice(0, -2);
    const height = getComputedStyle(wrap.querySelector('.current-image')).height.slice(0, -2);
    canvas.width = width;
    canvas.height = height;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.display = 'block';
    canvas.style.zIndex = '1';

    wrapCommentsCanvas.appendChild(canvas);
}

function circle(point) {
    ctx.beginPath();
    ctx.arc(...point, BRUSH_RADIUS / 2, 0, 2 * Math.PI);
    ctx.fill();
}

function smoothCurveBetween(p1, p2) {
    const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
    ctx.quadraticCurveTo(...p1, ...cp);
}

function smoothCurve(points) {
    ctx.beginPath();
    ctx.lineWidth = BRUSH_RADIUS;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.moveTo(...points[0]);

    for (let i = 1; i < points.length - 1; i++) {
        smoothCurveBetween(points[i], points[i + 1]);
    }

    ctx.stroke();
}

function makePoint(x, y) {
    return [x, y];
}

function repaint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    curves.forEach((curve) => {
        ctx.strokeStyle = curve.color;
        ctx.fillStyle = curve.color;

        circle(curve[0]);
        smoothCurve(curve);

    });
};

function sendMaskState() {
    canvas.toBlob(function (blob) {
        connection.send(blob);
        console.log(connection);
    });
};

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
const ctx = canvas.getContext('2d');
const BRUSH_RADIUS = 4; 
let curves = [];
let drawing = false;
let needsRepaint = false;


let connection;
let dataGetParse;
let showComments = {};
let currentColor;
let curHost;

let url = new URL(`${window.location.href}`);
let paramId = url.searchParams.get('id');

currentImage.src = '';

menu.dataset.state = 'initial';
wrap.dataset.state = '';
hideItem(burger);
wrap.removeChild(document.querySelector('.comments__form'));
menu.querySelector('.new').addEventListener('click', uploadFileFromInput);

wrap.addEventListener('drop', onFilesDrop);
wrap.addEventListener('dragover', event => event.preventDefault());

burger.addEventListener('click', showMenu);
canvas.addEventListener('click', checkComment);

document.querySelector('.menu__toggle-title_on').addEventListener('click', markerCheckboxOn);
document.querySelector('#comments-on').addEventListener('click', markerCheckboxOn);

document.querySelector('.menu__toggle-title_off').addEventListener('click', markerCheckboxOff);
document.querySelector('#comments-off').addEventListener('click', markerCheckboxOff);

copyButton.addEventListener('click', () => {
    menuUrl.select();
    document.execCommand('copy');
});

urlId(paramId);

canvas.addEventListener("mousedown", (event) => {
    if (!(menu.querySelector('.draw').dataset.state === 'selected')) return;
    drawing = true;

    const curve = [];
    curve.color = currentColor;

    curve.push(makePoint(event.offsetX, event.offsetY));
    curves.push(curve);
    needsRepaint = true;
});

canvas.addEventListener("mouseup", (event) => {
    menu.style.zIndex = '1';
    drawing = false;
});

canvas.addEventListener("mouseleave", (event) => {
    drawing = false;
});

canvas.addEventListener("mousemove", (event) => {
    if (drawing) {
        menu.style.zIndex = '0';
        curves[curves.length - 1].push(makePoint(event.offsetX, event.offsetY));
        needsRepaint = true;
        debounceSendMask();
    }
});

Array.from(menu.querySelectorAll('.menu__color')).forEach(color => {
    if (color.checked) {
        currentColor = getComputedStyle(color.nextElementSibling).backgroundColor;
    }
    color.addEventListener('click', (event) => {
        currentColor = getComputedStyle(event.currentTarget.nextElementSibling).backgroundColor;
    });
});

tick();

function showMenu() {
    menu.dataset.state = 'default';
    Array.from(menu.querySelectorAll('.mode')).forEach(modeItem => {
        modeItem.dataset.state = '';
        modeItem.addEventListener('click', () => {

            if (!modeItem.classList.contains('new')) {
                menu.dataset.state = 'selected';
                modeItem.dataset.state = 'selected';
            }
        })
    })
}

function errorRemove() {
    setTimeout(function () {
        hideItem(errorNode)
    }, 5000);
}

function hideItem(el) {
    el.style.display = 'none';
}

function showItem(el) {
    el.style.display = '';
}

function urlId(id) {
    if (!id) {
        return;
    }
    getImageData(id);
    showMenuShare();
}


function tick() {
    if (menu.offsetHeight > 66) {
        menu.style.left = (wrap.offsetWidth - menu.offsetWidth) - 1 + 'px';
    }

    if (needsRepaint) {
        repaint();
        needsRepaint = false;
    }

    window.requestAnimationFrame(tick);
};

function wss() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${dataGetParse.id}`);
    connection.addEventListener('message', event => {
        if (JSON.parse(event.data).event === 'pic') {
            if (JSON.parse(event.data).pic.mask) {
                canvas.style.background = `url(${JSON.parse(event.data).pic.mask})`;
            } else {
                canvas.style.background = ``;
            }
        }

        if (JSON.parse(event.data).event === 'comment') {
            insertWssCommentForm(JSON.parse(event.data).comment);
        }

        if (JSON.parse(event.data).event === 'mask') {
            canvas.style.background = `url(${JSON.parse(event.data).url})`;
        }
    });
}

window.addEventListener('beforeunload', () => {
    connection.close();
    console.log('Веб-сокет закрыт')
});

