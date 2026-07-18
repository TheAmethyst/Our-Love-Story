// ИННИЦИАЛИЗАЦИЯ ПРИ ЗАПУСКЕ
document.addEventListener("DOMContentLoaded", () => {
    openPage('home');
});



// ===== НАСТРОЙКА БАЗЫ ДАННЫХ =====
const { createClient } = window.supabase;
window.db = createClient(
    'https://rstnthtdxlvnjnbrksug.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzdG50aHRkeGx2bmpuYnJrc3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDY4MDAsImV4cCI6MjA5ODIyMjgwMH0.NSVOOqwr5QZdkdLdR2mTBG31sVvSu9XZy2ncOBR-osk'
);
const db = window.db;



// ===== СИСТЕМА ТЕМ =====
window.openThemeSettings = function() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('show');
    document.getElementById('themeModal').style.display = 'flex';
};
window.applyTheme = function(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('site_theme', themeName);
};
// Восстановление сохраненной темы при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('site_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
});



// ===== СЛУЖЕБНЫЕ ФУНКЦИИ =====
// Сжатие фото
window.compressImage = async function(file) {
    const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true
    };
    try {
        return await imageCompression(file, options);
    } catch (error) {
        console.error("Ошибка сжатия:", error);
        return file;
    }
}



// ===== МЕНЮ ПРОФИЛЯ =====
window.toggleProfileMenu = function() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
};
// Закрытие меню при клике вне его области
window.addEventListener('click', function(event) {
    if (!event.target.closest('.profile-menu-container')) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});
// Открытие окна настроек аккаунта
window.openAccountSettings = function() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.classList.remove('show'); // Закрываем выпадающее меню
    document.getElementById('accountModal').style.display = 'flex';
};



// ===== СИСТЕМА АВТОРИЗАЦИИ =====
async function checkAuth() {
    const { data: { session } } = await window.db.auth.getSession();
    const menuAuthBtn = document.getElementById('menuAuthBtn');
    const avatarImage = document.getElementById('avatarImage');
    const avatarIcon = document.getElementById('avatarIcon');
    if (session) {
        document.body.classList.add('admin-mode');
        if (menuAuthBtn) menuAuthBtn.innerText = 'Выйти';
        // Извлечение аватара из метаданных пользователя
        if (session.user.user_metadata && session.user.user_metadata.avatar_url) {
            const avatarUrl = session.user.user_metadata.avatar_url;
            avatarImage.src = avatarUrl;
            avatarImage.style.display = 'block';
            avatarIcon.style.display = 'none';
            
            const settingsPreview = document.getElementById('settingsAvatarPreview');
            if (settingsPreview) {
                settingsPreview.src = avatarUrl;
                settingsPreview.style.display = 'block';
                document.getElementById('settingsAvatarIcon').style.display = 'none';
            }
        }
    } else {
        document.body.classList.remove('admin-mode');
        if (menuAuthBtn) menuAuthBtn.innerText = 'Войти';
        // Сброс аватара при выходе
        if (avatarImage) avatarImage.style.display = 'none';
        if (avatarIcon) avatarIcon.style.display = 'block';
    }
}
document.addEventListener("DOMContentLoaded", checkAuth);

window.handleAuthAction = async function() {
    const { data: { session } } = await window.db.auth.getSession();
    const dropdown = document.getElementById('profileDropdown');
    // Скрываем выпадающее меню при любом действии
    if (dropdown) dropdown.classList.remove('show');
    if (session) {
        // Логика выхода
        await window.db.auth.signOut();
        document.body.classList.remove('admin-mode');
        document.getElementById('menuAuthBtn').innerText = 'Войти';
        alert("Вы вышли из режима редактирования.");
        location.reload(); // Перезагрузка страницы для полной очистки интерфейса
    } else {
        // Открытие окна входа
        document.getElementById('loginModal').style.display = 'flex';
    }
};

window.loginUser = async function() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    if (!email || !password) return alert("Укажите email и пароль");
    const { data, error } = await window.db.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) {
        alert("Ошибка входа: " + error.message);
    } else {
        // Скрываем окно и очищаем поля
        document.getElementById("loginModal").style.display = "none";
        document.getElementById("loginEmail").value = "";
        document.getElementById("loginPassword").value = "";
        // Автоматически обновляем весь интерфейс (включая загрузку аватара)
        await checkAuth();
        alert("Вы успешно вошли как владелец.");
    }
};

// Обновление почты и/или пароля пользователя
window.updateAccountData = async function() {
    const newEmail = document.getElementById('newEmail').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    if (!newEmail && !newPassword) {
        return alert("Нет данных для обновления.");
    }
    const updates = {};
    if (newEmail) updates.email = newEmail;
    if (newPassword) updates.password = newPassword;
    // Смена надписи на кнопке
    const saveBtn = document.querySelector('#accountModal .btn-save-polaroid');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "Обновление...";
    saveBtn.disabled = true;
    const { data, error } = await window.db.auth.updateUser(updates);
    saveBtn.innerText = originalText;
    saveBtn.disabled = false;
    if (error) {
        alert("Ошибка при обновлении: " + error.message);
    } else {
        alert("Данные аккаунта успешно обновлены.");
        document.getElementById('accountModal').style.display = 'none';
        document.getElementById('newEmail').value = "";
        document.getElementById('newPassword').value = "";
        // Если меняли почту, нужно обновить отображение (потребуется перезаход, но сессия сохраняется)
    }
};

// Загрузка нового аватара
window.uploadAvatar = async function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const textLabel = document.getElementById('avatarUploadText');
    textLabel.innerText = "Загрузка...";
    try {
        const { data: { user } } = await window.db.auth.getUser();
        if (!user) throw new Error("Пользователь не авторизован");
        // 1. Сжатие изображения
        const compressedFile = await window.compressImage(file);
        const fileName = `avatar_${user.id}_${Date.now()}`;
        // 2. Загрузка в бакет
        const { error: uploadError } = await window.db.storage
            .from('post-images')
            .upload(fileName, compressedFile);
        if (uploadError) throw uploadError;
        // 3. Получение публичной ссылки
        const { data: urlData } = window.db.storage.from('post-images').getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;
        // 4. Сохранение ссылки в профиле пользователя
        const { error: updateError } = await window.db.auth.updateUser({
            data: { avatar_url: publicUrl }
        });
        if (updateError) throw updateError;
        // 5. Мгновенное обновление интерфейса
        document.getElementById('avatarImage').src = publicUrl;
        document.getElementById('avatarImage').style.display = 'block';
        document.getElementById('avatarIcon').style.display = 'none';
        document.getElementById('settingsAvatarPreview').src = publicUrl;
        document.getElementById('settingsAvatarPreview').style.display = 'block';
        document.getElementById('settingsAvatarIcon').style.display = 'none';
        textLabel.innerText = "Аватар обновлен";
    } catch (err) {
        console.error("Ошибка аватара:", err);
        alert("Не удалось загрузить аватар: " + err.message);
        textLabel.innerText = "Ошибка загрузки";
    }
};
// ===============================






// НАВИГАЦИЯ
// Переключение страниц
window.openPage = function(page) {
    const content = document.getElementById("content");
    const panel = document.getElementById("yearsPanel");
    // ВАЖНО: Объявляем ВСЕ три кнопки и контейнер управления
    const controls = document.getElementById("mainControls");
    const addMemoryBtn = document.getElementById("addMemoryBtn");
    const addGalleryBtn = document.getElementById("addGalleryBtn");
    const addTimelineBtn = document.getElementById("addTimelineBtn");
    // Управление системным ползунком прокрутки
    if (page === 'home' || page === 'history') {
        document.body.style.overflowY = 'hidden'; // Скрываем на главной и в постах
    } else {
        document.body.style.overflowY = 'auto';   // Показываем в галерее и таймлайне
    }
    // Плавное исчезновение старого контента
    if (content) content.classList.add("fade-out");
    setTimeout(() => {
        // ВОТ ЭТА СТРОКА ВОЗВРАЩАЕТ ВИДИМОСТЬ БЛОКУ:
        if (content) content.classList.remove("fade-out"); 
        // --- 1. СБРОС СОСТОЯНИЯ (Скрываем всё лишнее) ---
        if (panel) panel.style.display = "none";
        if (content) content.innerHTML = "";
        if (addMemoryBtn) addMemoryBtn.style.display = "none";
        if (addGalleryBtn) addGalleryBtn.style.display = "none";
        if (addTimelineBtn) addTimelineBtn.style.display = "none";
        if (controls) controls.style.display = "none";
        document.body.style.backgroundImage = "none";
        // --- 2. ЛОГИКА ДЛЯ ГЛАВНОЙ СТРАНИЦЫ (Home) ---
        if (page === 'home') {
            if (controls) controls.style.display = "flex"; 
            if (addMemoryBtn) addMemoryBtn.style.display = "block";
            if (addTimelineBtn) addTimelineBtn.style.display = "block";
            if (addGalleryBtn) addGalleryBtn.style.display = "block";
            window.updateBackground('main');
        }
        // --- 3. ЛОГИКА ДЛЯ ИСТОРИИ (Love Notes) ---
        else if (page === 'history') {
            if (panel) panel.style.display = "block";
            window.updateBackground('background'); // Вызов общего фона
            window.loadPosts(); 
        }
        // --- 4. ЛОГИКА ДЛЯ ГАЛЕРЕИ (Gallery) ---
        else if (page === 'gallery') {
            window.updateBackground('background'); // Вызов общего фона
            window.loadGallery();
        }
        // --- 5. ЛОГИКА ДЛЯ ТАЙМЛАЙНА (Timeline) ---
        else if (page === 'timeline') {
            window.updateBackground('background'); // Вызов общего фона
            if (typeof window.loadTimeline === 'function') {
                window.loadTimeline();
            }
        }
    }, 300);
};

// Функция смены фона
window.updateBackground = function(bgName) {
    const bgElement = document.getElementById('bg');
    if (!bgElement) return;
    
    let finalSrc = `img/${bgName}.jpg`; // Стандартная логика для ПК

    // Жесткое переопределение для мобильной версии (ширина 768px и меньше)
    if (window.innerWidth <= 768) {
        if (bgName === 'main') {
            finalSrc = 'img/main_mobile.jpg'; // Фон для главного экрана
        } else {
            finalSrc = 'img/background.jpg'; // Единый фон для всех остальных разделов
        }
    }

    bgElement.style.opacity = "0.3"; 
    
    const img = new Image();
    img.onload = () => {
        setTimeout(() => {
            bgElement.src = finalSrc;
            bgElement.style.opacity = "1";
        }, 300);
    };
    img.onerror = () => {
        console.error("Ошибка загрузки фона:", finalSrc);
        // Фолбэк в случае отсутствия файла
        setTimeout(() => {
            bgElement.src = 'img/background.jpg'; 
            bgElement.style.opacity = "1";
        }, 300);
    };
    img.src = finalSrc;
};



// ФОРМА ДОБАВЛЕНИЯ ПОСТА
// Управление формой
window.openModal = function() {
    const modal = document.getElementById("postModal"); // ID из твоего index.html
    if (modal) {
        window.clearForm(); // Сначала чистим, потом открываем
        modal.style.display = "flex";
    } else {
        console.error("Ошибка: Окно 'postModal' не найдено!");
    }
};
// Закрытие
window.closeModal = function() {
    const modal = document.getElementById("postModal");
    if (modal) {
        modal.style.display = "none";
        if (typeof window.clearForm === 'function') {
            window.clearForm(); // Очистка всех полей, включая заголовок, при закрытии
        }
    }
};

// Превью изображения
window.previewImage = function(input) {
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Полная очистка
window.clearForm = function() {
    const dateField = document.getElementById('postDate');
    const textField = document.getElementById('postText');
    const fileField = document.getElementById('postImage');
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const titleField = document.getElementById('postTitle');
    if (titleField) titleField.value = "";
    if (dateField) dateField.value = "";
    if (textField) textField.value = "";
    if (fileField) fileField.value = "";
    if (preview) {
        preview.src = "";
        preview.style.display = "none";
    }
    if (placeholder) {
        placeholder.style.display = "block";
    }
};



// ФОРМА ДОБАВЛЕНИЯ ФОТО
window.openGalleryModal = function() {
    const modal = document.getElementById("galleryForm");
    if (modal) modal.style.display = "flex";
};
window.closeGalleryForm = function() {
    const modal = document.getElementById("galleryForm");
    if (modal) {
        modal.style.display = "none";
        // Очистка превью
        document.getElementById('galleryImageFile').value = "";
        document.getElementById('galleryImagePreview').style.display = "none";
        document.getElementById('galleryUploadPlaceholder').style.display = "block";
    }
};
window.previewGalleryImage = function(input) {
    const preview = document.getElementById('galleryImagePreview');
    const placeholder = document.getElementById('galleryUploadPlaceholder');
    if (input.files && input.files.length > 0) {
        if (input.files.length === 1) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            }
            reader.readAsDataURL(input.files[0]);
        } else {
            preview.style.display = 'none';
            placeholder.style.display = 'block';
            placeholder.innerHTML = `<span class="plus-icon">📸</span><p>Выбрано фото: ${input.files.length}</p>`;
        }
    }
};



// ФОРМА ДОБАВЛЕНИЯ СОБЫТИЯ
window.openTimelineModal = () => {
    const modal = document.getElementById('timelineModal');
    if (modal) modal.style.display = 'flex';
};
window.closeTimelineModal = () => {
    const modal = document.getElementById('timelineModal');
    if (modal) modal.style.display = 'none';
    document.getElementById('timelineDate').value = '';
    document.getElementById('timelineTitle').value = '';
    document.getElementById('timelineFile').value = '';
    document.getElementById('timelineImgPreview').src = '';
    document.getElementById('timelineImgPreview').style.display = 'none';
    document.getElementById('timelinePreviewPlaceholder').style.display = 'block';
};
window.previewTimelineImg = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('timelineImgPreview');
            img.src = e.target.result;
            img.style.display = 'block';
            document.getElementById('timelinePreviewPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
};