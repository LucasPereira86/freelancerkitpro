// Auth.js - Authentication Logic

document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
        showAlert('Firebase não configurado. Configure suas credenciais em firebase-config.js', 'error');
        return;
    }

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabName + 'Tab').classList.add('active');

            // Clear alert
            hideAlert();
        });
    });

    // Login Form
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            showAlert('Entrando...', 'success');
            await auth.signInWithEmailAndPassword(email, password);
            window.location.href = 'app.html';
        } catch (error) {
            showAlert(getErrorMessage(error.code), 'error');
        }
    });

    // Register Form
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

        if (password !== passwordConfirm) {
            showAlert('As senhas não coincidem!', 'error');
            return;
        }

        // Validação do Código de Acesso VIP (Anti-Pirataria via Hash SHA-256)
        // Isso impede que alguém descubra a senha olhando o código fonte
        const accessCode = document.getElementById('registerAccessCode').value.trim().toUpperCase();

        // Hash SHA-256 de 'FREELA2025'
        const HASH_FREELA = '1a0f9a49ec7c0652590ca0e9c909bec9a80cde81a39c9c7e5f4e7476dd350be0';
        // Hash SHA-256 de 'ADMIN123'
        const HASH_ADMIN = '5b40171489659251097e7790fc2f1892e2183a72546fe1df283d07865db9149c';

        const validHashes = [HASH_FREELA, HASH_ADMIN];

        try {
            // Calcular hash do que foi digitado
            const inputHash = await sha256(accessCode);

            if (!validHashes.includes(inputHash)) {
                showAlert('Código de Acesso inválido! Adquira sua licença.', 'error');
                return;
            }
        } catch (e) {
            console.error(e);
            showAlert('Erro ao validar acesso. Tente um navegador mais recente.', 'error');
            return;
        }

        try {
            showAlert('Criando conta...', 'success');

            // Create user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update display name
            await user.updateProfile({ displayName: name });

            // Save user data to Realtime Database
            await db.ref('users/' + user.uid).set({
                name: name,
                email: email,
                createdAt: Date.now(),
                profile: {
                    phone: '',
                    cpfCnpj: '',
                    address: '',
                    profession: '',
                    company: '',
                    bio: ''
                },
                stats: {
                    propostas: 0,
                    contratos: 0,
                    recibos: 0
                }
            });

            window.location.href = 'app.html';
        } catch (error) {
            showAlert(getErrorMessage(error.code), 'error');
        }
    });

    // Forgot Password
    const forgotPasswordLink = document.getElementById('forgotPassword');
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();

        if (!email) {
            showAlert('Digite seu email primeiro', 'error');
            return;
        }

        try {
            await auth.sendPasswordResetEmail(email);
            showAlert('Email de recuperação enviado! Verifique sua caixa de entrada.', 'success');
        } catch (error) {
            showAlert(getErrorMessage(error.code), 'error');
        }
    });

    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            window.location.href = 'app.html';
        }
    });
});

// Alert Functions
function showAlert(message, type) {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `alert show alert-${type}`;
}

function hideAlert() {
    const alertBox = document.getElementById('alertBox');
    alertBox.className = 'alert';
}

// Error Messages in Portuguese
function getErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'Este email já está em uso.',
        'auth/invalid-email': 'Email inválido.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
        'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
        'auth/invalid-credential': 'Credenciais inválidas. Verifique email e senha.'
    };

    return messages[errorCode] || 'Ocorreu um erro. Tente novamente.';
}

// Helper SHA-256 for secure password hashing
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
