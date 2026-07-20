// ===== ЗАГРУЗКА СТРАНИЦЫ ПОСТОВ =====
// Загрузка постов
let currentSelectedYear = null;
window.loadPosts = async function(targetYear = null) {
    document.body.removeAttribute('data-page');
    const content = document.getElementById("content");
    const panel = document.getElementById("yearsPanel");
    if (content) content.innerHTML = "<div class='loader' style='margin-top: 100px; text-align: center;'>Синхронизация...</div>";
    // 1. Получаем уникальные года
    const { data: yearsData, error: yearsError } = await window.db.from("posts").select("year");
    if (yearsError) return console.error("Ошибка загрузки годов:", yearsError);
    window.availableYears = [...new Set(yearsData.map(p => p.year).filter(Boolean))].sort((a, b) => a - b);
    // 2. Устанавливаем текущий год
    if (targetYear) {
        currentSelectedYear = targetYear;
    } else if (!currentSelectedYear && window.availableYears.length > 0) {
        currentSelectedYear = Math.max(...window.availableYears);
    }
    if (!currentSelectedYear) {
        if (content) content.innerHTML = "<p style='margin-top: 100px; text-align: center;'>Нет записей</p>";
        return;
    }
    // 3. Скачиваем посты
    const { data: postsData, error: postsError } = await window.db.from("posts").select("*").eq("year", currentSelectedYear);
    if (postsError) return console.error("Ошибка загрузки постов:", postsError);
    // 4. Сортировка
    const sortedData = postsData.sort((a, b) => {
        const parseDate = (dateStr) => {
            if (!dateStr) return 0;
            if (dateStr.includes('-')) return new Date(dateStr).getTime();
            const [d, m, y] = dateStr.split('.').map(Number);
            return new Date(y, m - 1, d).getTime();
        };
        return parseDate(a.date) - parseDate(b.date);
    });
    window.allPosts = sortedData;
    // 5. Рендер
    renderYearsMenu();
    if (typeof renderFilteredPosts === 'function') {
        renderFilteredPosts();
    }
};



// ===== СОРТИРОВКА ПОСТОВ =====
function renderFilteredPosts() {
    const contentDiv = document.getElementById('content');
    if (!contentDiv) return;
    const postsToRender = (window.allPosts || []).filter(p => Number(p.year) === Number(currentSelectedYear));
    // Добавлен padding-left: 120px для карусели, чтобы первая карточка не перекрывалась меню
    contentDiv.innerHTML = `
        <div class="carousel-wrapper" id="dynamicCarousel" style="display: flex; margin: 120px auto 20px auto; z-index: 100; position: relative; padding-left: 120px;">
            <button class="carousel-arrow left-arrow" onclick="scrollPosts(-1)">&#10094;</button>
            <div id="postsContainer" class="posts-track"></div>
            <button class="carousel-arrow right-arrow" onclick="scrollPosts(1)">&#10095;</button>
        </div>
    `;
    const container = document.getElementById('postsContainer');
    if (!postsToRender || postsToRender.length === 0) {
        container.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-color);">Нет записей за этот год</p>';
        return;
    }
    postsToRender.forEach(p => {
        const card = document.createElement('div');
        p.image = p.image || p.image_url; 
        renderCardHTML(card, p); 
        container.appendChild(card);
    });
    // Прямая привязка перехватчика к обертке карусели
    const carouselWrapper = document.getElementById('dynamicCarousel');
    const track = document.getElementById('postsContainer');
    if (carouselWrapper && track) {
        track.scrollLeft = 0; 
        // Очистка старых событий (если есть)
        carouselWrapper.onwheel = null; 
        // Привязка нового события с отключением пассивного режима
        carouselWrapper.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) {
                e.preventDefault(); // Жесткая блокировка вертикального скролла
                track.scrollLeft += (e.deltaY * 1.5); // Сдвиг по горизонтали
            }
        }, { passive: false });
    }
}

// Вспомогательная функция, чтобы не дублировать код
function renderCardHTML(container, p) {
    // 1. Проверяем наличие фото в базе
    const hasImg = p.image && p.image.trim() !== '';
    // 2. Назначаем класс градиента, если фото отсутствует
    container.className = hasImg ? 'post-card' : 'post-card no-image-card';
    const postDataStr = encodeURIComponent(JSON.stringify(p));
    container.setAttribute('onclick', `openFullPost('${postDataStr}')`);
    const textArray = (p.text || '').split(' ');
    const introText = textArray.slice(0, 5).join(' ') + (textArray.length > 5 ? '...' : '');
    const postTitle = p.title || 'Без заголовка'; 
    // 3. Генерируем HTML картинки только если она реально существует
    const imgHtml = hasImg ? `<img src="${p.image}" alt="Фото">` : '';
    container.innerHTML = `
        ${imgHtml}
        <div class="post-card-overlay">
            <div class="post-card-title">${postTitle}</div>
            <div class="post-card-date">${p.date || ''}</div>
            <div class="post-card-intro">${introText}</div>
        </div>
    `;
}



// ===== ПАНЕЛЬ ГОДОВ =====
function renderYearsMenu() {
    const panel = document.getElementById("yearsPanel");
    if (!panel) return;
    panel.innerHTML = "";
    window.availableYears.forEach(year => {
        const btn = document.createElement("div");
        btn.className = `year-link ${Number(year) === Number(currentSelectedYear) ? 'active' : ''}`;
        btn.innerText = year;
        btn.onclick = () => window.loadPosts(year);
        panel.appendChild(btn);
    });
    panel.style.display = "flex";
}



// ===== ДОБАВЛЕНИЕ ПОСТА =====
window.addPost = async function() {
    // 1. ПОЛУЧАЕМ ДАННЫЕ (Убрали проверку isGalleryMode)
    const titleInput = document.getElementById("postTitle") ? document.getElementById("postTitle").value : "";
    const dateInput = document.getElementById("postDate").value;
    const textInput = document.getElementById("postText").value;
    const fileInput = document.getElementById("postImage").files[0];
    const saveBtn = document.getElementById("saveBtn");
    // 2. ВАЛИДАЦИЯ (Только для обычных постов)
    if (!dateInput || !textInput) {
        alert("Пожалуйста, заполни дату и текст");
        return;
    }
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Загрузка...";
    }
    let imageUrl = "";
    try {
        // 3. ЗАГРУЗКА ФОТО
        if (fileInput) {
            const compressed = await compressImage(fileInput);
            const fileExt = fileInput.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: uploadError } = await db.storage
                .from("post-images")
                .upload(fileName, compressed);
            if (uploadError) throw uploadError;
            const { data: urlData } = await db.storage
                .from("post-images")
                .getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }
        // 4. СОХРАНЕНИЕ В ТАБЛИЦУ
        let year = "2026";
        let formattedDate = dateInput;
        // Преобразование даты из календаря (YYYY-MM-DD) в ДД.ММ.ГГГГ и извлечение года
        if (dateInput.includes("-")) {
            const parts = dateInput.split("-");
            year = parts[0];
            formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        } else if (dateInput.includes(".")) {
            year = dateInput.split(".")[2] || "2026";
        }
        const { error: insertError } = await window.db.from("posts").insert([
            { 
                title: titleInput,
                date: formattedDate, 
                text: textInput, 
                image: imageUrl, 
                year: parseInt(year),
            }
        ]);
        if (insertError) throw insertError;
        // 5. ЗАКРЫТИЕ ФОРМЫ
        window.closeModal();
        // 6. ОБНОВЛЕНИЕ ЭКРАНА (Упростили логику)
        const panel = document.getElementById("yearsPanel");
        const isHistoryPage = panel && panel.style.display === "block";
        if (isHistoryPage) {
            window.loadPosts(); // Обновляем ленту, если мы в истории
        } else {
            document.getElementById("content").innerHTML = ""; // Очищаем, если на главной
        }
    } catch (err) {
        console.error("Критическая ошибка добавления:", err);
        alert("Ошибка: " + err.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Сохранить";
        }
        // Жесткий вызов закрытия формы и очистки полей
        if (typeof window.closeModal === 'function') {
            window.closeModal();
        } else {
            document.getElementById("postModal").style.display = "none";
        }
    }
};



// ===== УДАЛЕНИЕ ПОСТА =====
window.deletePost = async function(id, imageUrl) {
    if (!confirm("Удалить это воспоминание навсегда?")) return;

    try {
        // 1. УДАЛЕНИЕ ИЗ STORAGE
        // Внутри deletePost, замени блок удаления из Storage на этот:
        if (imageUrl) {
            const cleanUrl = imageUrl.split('?')[0];
            // ТЕСТ: Выведем в консоль все файлы, которые БАЗА видит в бакете
            const { data: listFiles } = await db.storage.from("post-images").list();
            console.log("Файлы, которые реально есть в Storage:", listFiles.map(f => f.name));
            const bucketName = "post-images/";
            const fileName = cleanUrl.slice(cleanUrl.lastIndexOf(bucketName) + bucketName.length);
            console.log("Мы пытаемся удалить это:", fileName);
            const { data: delData, error: storageError } = await db.storage
                .from("post-images")
                .remove([fileName]);

            if (storageError) console.error("Ошибка:", storageError);
            else console.log("Результат:", delData);
        }
        // 2. УДАЛЕНИЕ ИЗ ТАБЛИЦЫ
        const { error: tableError } = await db.from("posts").delete().eq("id", id);
        if (tableError) throw tableError;
        window.loadPosts();
    } catch (err) {
        console.error("Ошибка:", err);
    }
};



// ===== ЛОГИКА ГОРИЗОНТАЛЬНОЙ КАРУСЕЛИ И ПОЛНОЭКРАННОГО ПОСТА =====
// Функция горизонтальной прокрутки стрелками
window.scrollPosts = function(direction) {
    const container = document.getElementById('postsContainer');
    if (container) {
        // Прокрутка на ширину карточки (300px) + отступ (20px)
        const scrollAmount = 320; 
        container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
};
// Функция открытия поста на весь экран
window.openFullPost = async function(postDataStr) {
    const modal = document.getElementById('fullPostModal');
    const body = document.getElementById('fullPostBody');
    body.style.width = '90vw'; 
    body.style.visibility = 'hidden';
    const post = JSON.parse(decodeURIComponent(postDataStr));
    // Проверка наличия фотографии в базе данных
    const hasImage = post.image && post.image.trim() !== '';
    let dateStr = '';
    if (post.date && post.date.includes('.')) {
        dateStr = post.date;
    } else {
        const dateObj = new Date(post.date || post.created_at);
        dateStr = dateObj.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const postTitle = post.title || 'Без заголовка';
    let user = null;
    try {
        const { data } = await window.db.auth.getUser();
        user = data?.user;
    } catch (e) {
        console.error("Ошибка при проверке сессии:", e);
    }
    const deleteBtnHtml = user ? `
        <button class="full-post-delete-btn" 
                onclick="deletePost(${post.id}, '${post.image || ''}'); document.getElementById('fullPostModal').style.display='none';">
            удалить
        </button>
    ` : '';
    // Генерируем блок картинки только если она есть
    let imageHtml = '';
    if (hasImage) {
        imageHtml = `
            <div class="full-post-image-container">
                <img id="fullPostImg" src="${post.image}" alt="Фото">
            </div>
        `;
    }
    body.innerHTML = `
        ${imageHtml}
        <div class="full-post-text-container">
            <div class="full-post-scroll-area">
                <div id="fullPostTitle">${postTitle}</div>
                <div id="fullPostDate">${dateStr}</div>
                <div id="fullPostText">${post.text || ''}</div>
            </div>
            ${deleteBtnHtml}
        </div>
    `;
    // Разделение логики загрузки
    if (hasImage) {
        body.classList.remove('no-image-layout');
        const imgEl = document.getElementById('fullPostImg');
        imgEl.onload = function() {
            if (imgEl.naturalWidth > imgEl.naturalHeight) {
                body.classList.add('horizontal-layout');
                const fixWidth = () => {
                    const realImgWidth = Math.ceil(imgEl.getBoundingClientRect().width);
                    if (realImgWidth > 0) {
                        const container = body.querySelector('.full-post-image-container');
                        const compStyle = window.getComputedStyle(container);
                        const padLeft = parseFloat(compStyle.paddingLeft) || 0;
                        const padRight = parseFloat(compStyle.paddingRight) || 0;
                        let finalWidth = realImgWidth;
                        const maxWidth = window.innerWidth * 0.9;
                        if (finalWidth > maxWidth) finalWidth = maxWidth;
                        if (finalWidth < 250) finalWidth = 250;
                        body.style.width = finalWidth + 'px';
                    }
                    body.style.visibility = 'visible'; 
                };
                requestAnimationFrame(() => {
                    requestAnimationFrame(fixWidth);
                    setTimeout(fixWidth, 50); 
                });
            } else {
                body.classList.remove('horizontal-layout');
                body.style.width = ''; 
                body.style.visibility = 'visible';
            }
        };
    } else {
        // Логика для текстового поста (без фото)
        body.classList.remove('horizontal-layout');
        body.classList.add('no-image-layout');
        body.style.width = '600px'; // Фиксированная базовая ширина для комфортного чтения
        body.style.visibility = 'visible';
    }
    modal.style.display = 'flex';
};

// Закрытие полноэкранного поста при клике вне его области (по темному фону)
document.addEventListener('click', function(event) {
    const modal = document.getElementById('fullPostModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});



// ===== ЛОГИКА ДОЛГОГО НАЖАТИЯ ДЛЯ КНОПКИ УДАЛЕНИЯ =====
const postBodyElement = document.getElementById('fullPostBody');
let longPressTimer;

if (postBodyElement) {
    postBodyElement.addEventListener('touchstart', function(e) {
        // Игнорируем касание, если оно произошло прямо по кнопке удаления
        if (e.target.closest('.full-post-delete-btn')) return;

        longPressTimer = setTimeout(function() {
            const deleteBtn = document.querySelector('.full-post-delete-btn');
            if (deleteBtn) {
                deleteBtn.classList.add('show-action');
                // Запуск короткой вибрации (50 мс) для тактильного отклика, если поддерживается устройством
                if (navigator.vibrate) navigator.vibrate(50);
            }
        }, 600); 
    }, { passive: true });

    // Отмена таймера, если пользователь начал скроллить текст или отпустил палец
    const clearTimer = () => clearTimeout(longPressTimer);
    
    postBodyElement.addEventListener('touchmove', clearTimer);
    postBodyElement.addEventListener('touchend', clearTimer);
    postBodyElement.addEventListener('touchcancel', clearTimer);
}
