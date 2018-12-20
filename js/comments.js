'use strict';

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
