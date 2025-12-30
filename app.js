// App.js - Main Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        initApp(user);
    });
});

// Initialize App
async function initApp(user) {
    // Set user info in header
    document.getElementById('userName').textContent = user.displayName || 'Usuário';
    document.getElementById('userAvatar').textContent = (user.displayName || 'U').charAt(0).toUpperCase();
    document.getElementById('welcomeName').textContent = user.displayName?.split(' ')[0] || 'Usuário';

    // Load user data
    await loadUserData(user.uid);

    // Setup navigation
    setupNavigation();

    // Setup máscaras de formatação (ANTES dos formulários)
    setupMasks();

    // Setup forms
    setupPropostaForm();
    setupContratoForm();
    setupReciboForm();
    setupCalculadora();
    setupPerfil(user);

    // Setup histórico de documentos
    setupHistorico();

    // Logout button
    document.getElementById('btnLogout').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        });
    });
}

// ===============================
// MÁSCARAS DE FORMATAÇÃO
// ===============================

function setupMasks() {
    // Aplicar máscara de CPF/CNPJ
    const cpfCnpjFields = [
        'contratanteCpfCnpj',
        'pagadorCpfCnpj',
        'perfilCpfCnpj'
    ];

    cpfCnpjFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('input', (e) => {
                e.target.value = formatCpfCnpj(e.target.value);
            });
        }
    });

    // Aplicar máscara de telefone
    const phoneFields = [
        'clienteTelefone',
        'perfilTelefone'
    ];

    phoneFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('input', (e) => {
                e.target.value = formatPhone(e.target.value);
            });
        }
    });

    // Aplicar máscara de valores monetários
    const valueFields = [
        'projetoValor',
        'contratoValor',
        'reciboValor',
        'custoAluguel',
        'custoInternet',
        'custoSoftware',
        'custoOutros',
        'salarioDesejado'
    ];

    valueFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('input', (e) => {
                e.target.value = formatMoney(e.target.value);
            });
            // Permitir apenas números
            field.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace') {
                    e.preventDefault();
                }
            });
        }
    });
}

// Formatar valor monetário (R$ 1.000,00)
function formatMoney(value) {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '');

    // Remove zeros à esquerda
    numbers = numbers.replace(/^0+/, '') || '0';

    // Garante pelo menos 3 dígitos (para centavos)
    while (numbers.length < 3) {
        numbers = '0' + numbers;
    }

    // Separa reais e centavos
    const cents = numbers.slice(-2);
    const reals = numbers.slice(0, -2);

    // Formata os reais com pontos de milhar
    const formattedReals = reals.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `R$ ${formattedReals},${cents}`;
}

// Extrair valor numérico de string formatada
function parseMoney(value) {
    if (!value) return 0;
    // Remove "R$ " e pontos, troca vírgula por ponto
    const clean = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

// Formatar CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
function formatCpfCnpj(value) {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length <= 11) {
        // CPF
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        // CNPJ
        return numbers.substring(0, 14)
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
}

// Formatar Telefone (00) 00000-0000
function formatPhone(value) {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length <= 10) {
        // Telefone fixo
        return numbers
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        // Celular
        return numbers.substring(0, 11)
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2');
    }
}

// Load user data from Realtime Database
async function loadUserData(uid) {
    try {
        const snapshot = await db.ref('users/' + uid).once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();

            // Update stats
            document.getElementById('statPropostas').textContent = data.stats?.propostas || 0;
            document.getElementById('statContratos').textContent = data.stats?.contratos || 0;
            document.getElementById('statRecibos').textContent = data.stats?.recibos || 0;

            // Save to local storage for offline use
            localStorage.setItem('userData', JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Navigation
function setupNavigation() {
    const menuButtons = document.querySelectorAll('.sidebar-menu button, .quick-action-btn');
    const sections = document.querySelectorAll('.section-panel');

    menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionName = btn.dataset.section;

            // Update active states
            document.querySelectorAll('.sidebar-menu button').forEach(b => b.classList.remove('active'));
            document.querySelector(`.sidebar-menu button[data-section="${sectionName}"]`)?.classList.add('active');

            // Show section
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionName + 'Section')?.classList.add('active');
        });
    });
}

// ===============================
// PROPOSTA GENERATOR
// ===============================

function setupPropostaForm() {
    document.getElementById('btnGerarProposta').addEventListener('click', gerarPropostaPDF);
    document.getElementById('btnPreviewProposta')?.addEventListener('click', previewProposta);
}

function gerarPropostaPDF() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const profile = userData.profile || {};

    const clienteNome = document.getElementById('clienteNome').value || 'Cliente';
    const clienteEmail = document.getElementById('clienteEmail').value || '';
    const clienteEmpresa = document.getElementById('clienteEmpresa').value || '';
    const projetoTitulo = document.getElementById('projetoTitulo').value || 'Projeto';
    const projetoDescricao = document.getElementById('projetoDescricao').value || '';
    const projetoValor = parseMoney(document.getElementById('projetoValor').value);
    const projetoPrazo = document.getElementById('projetoPrazo').value || '';
    const projetoPagamento = document.getElementById('projetoPagamento').value || '';
    const projetoValidade = document.getElementById('projetoValidade').value || '7 dias';

    const hoje = new Date().toLocaleDateString('pt-BR');

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #6366f1;">
                <div>
                    <h1 style="margin: 0; color: #1a1a2e; font-size: 28px;">PROPOSTA COMERCIAL</h1>
                    <p style="margin: 5px 0 0; color: #666;">${hoje}</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-weight: bold; color: #6366f1;">${profile.company || userData.name || 'FreelancerKit Pro'}</p>
                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${profile.profession || ''}</p>
                </div>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h3 style="color: #6366f1; margin-bottom: 10px;">Para:</h3>
                <p style="margin: 0;"><strong>${clienteNome}</strong></p>
                ${clienteEmpresa ? `<p style="margin: 5px 0;">${clienteEmpresa}</p>` : ''}
                <p style="margin: 5px 0; color: #666;">${clienteEmail}</p>
            </div>
            
            <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h2 style="margin: 0 0 15px; color: #1a1a2e;">${projetoTitulo}</h2>
                <p style="margin: 0; line-height: 1.6; white-space: pre-line;">${projetoDescricao}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div style="padding: 20px; background: #e8f4f8; border-radius: 8px;">
                    <p style="margin: 0; color: #666; font-size: 14px;">Valor do Investimento</p>
                    <p style="margin: 10px 0 0; font-size: 28px; font-weight: bold; color: #1a1a2e;">R$ ${projetoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div style="padding: 20px; background: #fff3e0; border-radius: 8px;">
                    <p style="margin: 0; color: #666; font-size: 14px;">Prazo de Entrega</p>
                    <p style="margin: 10px 0 0; font-size: 20px; font-weight: bold; color: #1a1a2e;">${projetoPrazo}</p>
                </div>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h3 style="color: #6366f1; margin-bottom: 10px;">Condições de Pagamento</h3>
                <p style="margin: 0;">${projetoPagamento}</p>
            </div>
            
            <div style="margin-bottom: 40px; padding: 15px; background: #fff8e1; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 14px;"><strong>⚠️ Validade da proposta:</strong> ${projetoValidade}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; padding-top: 30px; border-top: 1px solid #ddd;">
                <div style="text-align: center;">
                    <div style="border-top: 1px solid #333; padding-top: 10px;">
                        <p style="margin: 0;">${userData.name || 'Prestador de Serviços'}</p>
                        <p style="margin: 5px 0 0; color: #666; font-size: 12px;">${profile.cpfCnpj || ''}</p>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="border-top: 1px solid #333; padding-top: 10px;">
                        <p style="margin: 0;">${clienteNome}</p>
                        <p style="margin: 5px 0 0; color: #666; font-size: 12px;">Contratante</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    generatePDF(htmlContent, `Proposta_${clienteNome.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    updateStats('propostas');

    // Salvar dados completos para edição futura
    const fullData = {
        clienteNome, clienteEmpresa, clienteTelefone,
        projetoTitulo, projetoDescricao, projetoValor,
        projetoPrazo, projetoPagamento, projetoValidade
    };

    saveToHistory('proposta', projetoTitulo, `Cliente: ${clienteNome}`, projetoValor, fullData);
}

function previewProposta() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const profile = userData.profile || {};

    const clienteNome = document.getElementById('clienteNome').value || 'Cliente';
    const projetoTitulo = document.getElementById('projetoTitulo').value || 'Projeto';
    const projetoDescricao = document.getElementById('projetoDescricao').value || '';
    const projetoValor = parseMoney(document.getElementById('projetoValor').value);
    const projetoPrazo = document.getElementById('projetoPrazo').value || '';

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">PROPOSTA COMERCIAL</h2>
            <p><strong>Para:</strong> ${clienteNome}</p>
            <h3 style="margin-top: 20px;">${projetoTitulo}</h3>
            <p>${projetoDescricao}</p>
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <p><strong>Valor:</strong> R$ ${projetoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>Prazo:</strong> ${projetoPrazo}</p>
            </div>
            <p style="margin-top: 20px; color: #666;"><em>Assinatura: ${userData.name || 'Prestador'}</em></p>
        </div>
    `;

    previewDocument(htmlContent, 'Prévia da Proposta');
}

// ===============================
// CONTRATO GENERATOR
// ===============================

function setupContratoForm() {
    document.getElementById('btnGerarContrato').addEventListener('click', gerarContratoPDF);
    document.getElementById('btnPreviewContrato')?.addEventListener('click', previewContrato);
}

function gerarContratoPDF() {
    let userData = JSON.parse(localStorage.getItem('userData') || '{}');
    // Fallback se não tiver nome no localStorage mas estiver logado
    if (!userData.name && auth.currentUser) {
        userData.name = auth.currentUser.displayName;
    }
    const profile = userData.profile || {};

    const contratanteNome = document.getElementById('contratanteNome').value || 'Contratante';
    const contratanteCpfCnpj = document.getElementById('contratanteCpfCnpj').value || '';
    const contratanteEndereco = document.getElementById('contratanteEndereco').value || '';
    const contratoObjeto = document.getElementById('contratoObjeto').value || '';
    const contratoValor = parseMoney(document.getElementById('contratoValor').value);
    const contratoPagamento = document.getElementById('contratoPagamento').value || '';
    const contratoInicio = document.getElementById('contratoInicio').value || '';
    const contratoFim = document.getElementById('contratoFim').value || '';

    const hoje = new Date().toLocaleDateString('pt-BR');

    const htmlContent = `
        <div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; line-height: 1.8;">
            <h1 style="text-align: center; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 2px;">Contrato de Prestação de Serviços</h1>
            
            <p style="text-align: justify; margin-bottom: 30px;">
                Pelo presente instrumento particular, as partes abaixo qualificadas têm entre si justo e contratado o seguinte:
            </p>
            
            <h3 style="border-bottom: 1px solid #333; padding-bottom: 10px;">CLÁUSULA PRIMEIRA - DAS PARTES</h3>
            
            <p style="text-align: justify; margin-bottom: 20px;">
                <strong>CONTRATANTE:</strong> ${contratanteNome}, inscrito(a) no CPF/CNPJ sob o nº ${contratanteCpfCnpj}, 
                com endereço em ${contratanteEndereco}.
            </p>
            
            <p style="text-align: justify; margin-bottom: 20px;">
                <strong>CONTRATADO:</strong> ${userData.name || 'Prestador de Serviços'}, inscrito(a) no CPF/CNPJ sob o nº ${profile.cpfCnpj || '_______________'}, 
                com endereço em ${profile.address || '_______________'}.
            </p>
            
            <h3 style="border-bottom: 1px solid #333; padding-bottom: 10px;">CLÁUSULA SEGUNDA - DO OBJETO</h3>
            
            <p style="text-align: justify; margin-bottom: 20px;">
                O presente contrato tem por objeto a prestação dos seguintes serviços:
            </p>
            <p style="text-align: justify; margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px;">
                ${contratoObjeto}
            </p>
            
            <h3 style="border-bottom: 1px solid #333; padding-bottom: 10px;">CLÁUSULA TERCEIRA - DO PRAZO</h3>
            
            <p style="text-align: justify; margin-bottom: 20px;">
                O presente contrato terá vigência de ${formatDate(contratoInicio)} a ${formatDate(contratoFim)}.
            </p>
            
            <h3 style="border-bottom: 1px solid #333; padding-bottom: 10px;">CLÁUSULA QUARTA - DO PREÇO E PAGAMENTO</h3>
            
            <p style="text-align: justify; margin-bottom: 20px;">
                Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO o valor total de 
                <strong>R$ ${contratoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> 
                (${valorPorExtenso(contratoValor)}), a ser pago da seguinte forma: ${contratoPagamento}.
            </p>
            
            <h3 style="border-bottom: 1px solid #333; padding-bottom: 10px;">CLÁUSULA QUINTA - DAS OBRIGAÇÕES</h3>
            
            <p style="text-align: justify; margin-bottom: 10px;"><strong>São obrigações do CONTRATADO:</strong></p>
            <ul style="margin-bottom: 20px;">
                <li>Executar os serviços com qualidade e dentro do prazo estabelecido;</li>
                <li>Manter sigilo sobre as informações do CONTRATANTE;</li>
                <li>Comunicar imediatamente quaisquer problemas na execução.</li>
            </ul>
            
            <p style="text-align: justify; margin-bottom: 10px;"><strong>São obrigações do CONTRATANTE:</strong></p>
            <ul style="margin-bottom: 20px;">
                <li>Efetuar os pagamentos nas datas acordadas;</li>
                <li>Fornecer as informações necessárias para execução dos serviços;</li>
                <li>Comunicar alterações relevantes ao projeto.</li>
            </ul>
            
            <h3 style="border-bottom: 1px solid #333; padding-bottom: 10px;">CLÁUSULA SEXTA - DO FORO</h3>
            
            <p style="text-align: justify; margin-bottom: 40px;">
                Fica eleito o foro da comarca de residência do CONTRATANTE para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato.
            </p>
            
            <p style="text-align: center; margin-bottom: 60px;">
                E por estarem assim justas e contratadas, assinam o presente instrumento em duas vias de igual teor.
            </p>
            
            <p style="text-align: center; margin-bottom: 60px;">
                _________________, ${hoje}
            </p>
            
            <div style="display: flex; justify-content: space-around; margin-top: 80px;">
                <div style="text-align: center; width: 45%;">
                    <div style="border-top: 1px solid #333; padding-top: 10px;">
                        <p style="margin: 0;"><strong>CONTRATANTE</strong></p>
                        <p style="margin: 5px 0 0;">${contratanteNome}</p>
                    </div>
                </div>
                <div style="text-align: center; width: 45%;">
                    <div style="border-top: 1px solid #333; padding-top: 10px;">
                        <p style="margin: 0;"><strong>CONTRATADO</strong></p>
                        <p style="margin: 5px 0 0;">${userData.name || 'Prestador de Serviços'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    generatePDF(htmlContent, `Contrato_${contratanteNome.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    updateStats('contratos');

    // Salvar dados completos para edição futura
    const fullData = {
        contratanteNome, contratanteCpfCnpj, contratanteEndereco,
        contratoObjeto, contratoValor, contratoPagamento,
        contratoInicio, contratoFim
    };

    saveToHistory('contrato', contratoObjeto.substring(0, 50) + '...', `Contratante: ${contratanteNome}`, contratoValor, fullData);
}

function previewContrato() {
    let userData = JSON.parse(localStorage.getItem('userData') || '{}');
    // Fallback se não tiver nome no localStorage mas estiver logado
    if (!userData.name && auth.currentUser) {
        userData.name = auth.currentUser.displayName;
    }
    const profile = userData.profile || {};

    const contratanteNome = document.getElementById('contratanteNome').value || 'Contratante';
    const contratoObjeto = document.getElementById('contratoObjeto').value || '';
    const contratoValor = parseMoney(document.getElementById('contratoValor').value);
    const contratoPagamento = document.getElementById('contratoPagamento').value || '';

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
            <p><strong>Contratante:</strong> ${contratanteNome}</p>
            <p><strong>Contratado:</strong> ${userData.name || 'Prestador'} ${profile.cpfCnpj ? '- CPF/CNPJ: ' + profile.cpfCnpj : ''}</p>
            <h4 style="margin-top: 20px;">Objeto do Contrato:</h4>
            <p>${contratoObjeto}</p>
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <p><strong>Valor:</strong> R$ ${contratoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p><strong>Forma de Pagamento:</strong> ${contratoPagamento}</p>
            </div>
        </div>
    `;

    previewDocument(htmlContent, 'Prévia do Contrato');
}

// ===============================
// RECIBO GENERATOR
// ===============================

function setupReciboForm() {
    // Auto calculate value in words (com delay para formatação completar)
    document.getElementById('reciboValor').addEventListener('input', (e) => {
        // Pequeno delay para permitir que a formatação do valor seja aplicada primeiro
        setTimeout(() => {
            const valor = parseMoney(e.target.value);
            document.getElementById('reciboExtenso').value = valorPorExtenso(valor);
        }, 10);
    });

    // Set today's date
    document.getElementById('reciboData').value = new Date().toISOString().split('T')[0];

    document.getElementById('btnGerarRecibo').addEventListener('click', gerarReciboPDF);
    document.getElementById('btnPreviewRecibo')?.addEventListener('click', previewRecibo);
}

function gerarReciboPDF() {
    let userData = JSON.parse(localStorage.getItem('userData') || '{}');
    // Fallback se não tiver nome no localStorage mas estiver logado
    if (!userData.name && auth.currentUser) {
        userData.name = auth.currentUser.displayName;
    }
    const profile = userData.profile || {};

    const reciboValor = parseMoney(document.getElementById('reciboValor').value);
    const reciboData = document.getElementById('reciboData').value || '';
    const reciboReferente = document.getElementById('reciboReferente').value || '';
    const pagadorNome = document.getElementById('pagadorNome').value || 'Pagador';
    const pagadorCpfCnpj = document.getElementById('pagadorCpfCnpj').value || '';

    const numero = Math.floor(Math.random() * 9000) + 1000;

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333;">
            <div style="border: 3px solid #6366f1; border-radius: 12px; padding: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #6366f1;">
                    <h1 style="margin: 0; color: #1a1a2e; font-size: 32px;">RECIBO</h1>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-size: 14px; color: #666;">Nº ${numero}</p>
                        <p style="margin: 5px 0 0; font-weight: bold; color: #6366f1; font-size: 24px;">R$ ${reciboValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                
                <p style="font-size: 18px; line-height: 2; text-align: justify; margin-bottom: 30px;">
                    Recebi de <strong>${pagadorNome}</strong>${pagadorCpfCnpj ? `, CPF/CNPJ: ${pagadorCpfCnpj}` : ''}, 
                    a importância de <strong>R$ ${reciboValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> 
                    (<em>${valorPorExtenso(reciboValor)}</em>), referente a:
                </p>
                
                <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.6;">${reciboReferente}</p>
                </div>
                
                <p style="margin-bottom: 40px;">
                    Para maior clareza, firmo o presente recibo para que produza os seus efeitos, dando plena, rasa e irrevogável quitação.
                </p>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px;">
                    <div>
                        <p style="margin: 0; color: #666;">Local e Data:</p>
                        <p style="margin: 5px 0 0; font-weight: bold;">${formatDate(reciboData)}</p>
                    </div>
                    <div style="text-align: center; min-width: 300px;">
                        <div style="border-top: 2px solid #333; padding-top: 10px;">
                            <p style="margin: 0; font-weight: bold;">${userData.name || 'Emitente'}</p>
                            <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${profile.cpfCnpj || ''}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    generatePDF(htmlContent, `Recibo_${numero}_${pagadorNome.replace(/\s+/g, '_')}.pdf`);
    updateStats('recibos');

    // Salvar dados completos para edição futura
    const fullData = {
        reciboValor, reciboData, reciboReferente,
        pagadorNome, pagadorCpfCnpj
    };

    saveToHistory('recibo', `Recibo #${numero}`, `Pagador: ${pagadorNome}`, reciboValor, fullData);
}

function previewRecibo() {
    let userData = JSON.parse(localStorage.getItem('userData') || '{}');
    // Fallback se não tiver nome no localStorage mas estiver logado
    if (!userData.name && auth.currentUser) {
        userData.name = auth.currentUser.displayName;
    }
    const profile = userData.profile || {};

    const reciboValor = parseMoney(document.getElementById('reciboValor').value);
    const reciboExtenso = document.getElementById('reciboExtenso').value || valorPorExtenso(reciboValor);
    const reciboReferente = document.getElementById('reciboReferente').value || '';
    const pagadorNome = document.getElementById('pagadorNome').value || 'Pagador';

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">RECIBO DE PAGAMENTO</h2>
            <div style="margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center;">
                <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 0;">R$ ${reciboValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p style="color: #666; margin-top: 10px;">(${reciboExtenso})</p>
            </div>
            <p style="margin-top: 20px;"><strong>Recebido de:</strong> ${pagadorNome}</p>
            <p><strong>Por:</strong> ${userData.name || 'Recebedor'} ${profile.cpfCnpj ? '- CPF/CNPJ: ' + profile.cpfCnpj : ''}</p>
            <p><strong>Referente a:</strong> ${reciboReferente}</p>
        </div>
    `;

    previewDocument(htmlContent, 'Prévia do Recibo');
}

// ===============================
// CALCULADORA
// ===============================

function setupCalculadora() {
    document.getElementById('btnCalcular').addEventListener('click', calcularPreco);
}

function calcularPreco() {
    const custoAluguel = parseMoney(document.getElementById('custoAluguel').value);
    const custoInternet = parseMoney(document.getElementById('custoInternet').value);
    const custoSoftware = parseMoney(document.getElementById('custoSoftware').value);
    const custoOutros = parseMoney(document.getElementById('custoOutros').value);
    const salarioDesejado = parseMoney(document.getElementById('salarioDesejado').value) || 5000;
    const horasMes = parseFloat(document.getElementById('horasMes').value) || 160;
    const margemLucro = parseFloat(document.getElementById('margemLucro').value) || 30;
    const impostos = parseFloat(document.getElementById('impostos').value) || 15;

    // Calculate totals
    const custosFixos = custoAluguel + custoInternet + custoSoftware + custoOutros;
    const custoTotal = custosFixos + salarioDesejado;

    // Add margin and taxes
    const comMargem = custoTotal * (1 + margemLucro / 100);
    const comImpostos = comMargem * (1 + impostos / 100);

    // Per hour
    const valorHora = comImpostos / horasMes;
    const valorDia = valorHora * 8;
    const valorMes = comImpostos;

    // Show results
    document.getElementById('resultHora').textContent = `R$ ${valorHora.toFixed(2)}`;
    document.getElementById('resultDia').textContent = `R$ ${valorDia.toFixed(2)}`;
    document.getElementById('resultMes').textContent = `R$ ${valorMes.toFixed(2)}`;
    document.getElementById('resultadoCalculo').style.display = 'block';
}

// ===============================
// PERFIL
// ===============================

function setupPerfil(user) {
    // Load existing data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const profile = userData.profile || {};

    document.getElementById('perfilNome').value = userData.name || user.displayName || '';
    document.getElementById('perfilEmail').value = user.email || '';
    document.getElementById('perfilCpfCnpj').value = profile.cpfCnpj || '';
    document.getElementById('perfilTelefone').value = profile.phone || '';
    document.getElementById('perfilEndereco').value = profile.address || '';
    document.getElementById('perfilProfissao').value = profile.profession || '';
    document.getElementById('perfilEmpresa').value = profile.company || '';
    document.getElementById('perfilBio').value = profile.bio || '';

    // Save button
    document.getElementById('btnSalvarPerfil').addEventListener('click', async () => {
        const updates = {
            name: document.getElementById('perfilNome').value,
            profile: {
                cpfCnpj: document.getElementById('perfilCpfCnpj').value,
                phone: document.getElementById('perfilTelefone').value,
                address: document.getElementById('perfilEndereco').value,
                profession: document.getElementById('perfilProfissao').value,
                company: document.getElementById('perfilEmpresa').value,
                bio: document.getElementById('perfilBio').value
            }
        };

        try {
            await db.ref('users/' + user.uid).update(updates);

            // Update local storage
            const current = JSON.parse(localStorage.getItem('userData') || '{}');
            localStorage.setItem('userData', JSON.stringify({ ...current, ...updates }));

            // Update header
            document.getElementById('userName').textContent = updates.name;
            document.getElementById('userAvatar').textContent = updates.name.charAt(0).toUpperCase();
            document.getElementById('welcomeName').textContent = updates.name.split(' ')[0];

            alert('Perfil salvo com sucesso!');
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Erro ao salvar. Tente novamente.');
        }
    });
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

function generatePDF(htmlContent, filename) {
    // Abrir nova janela para gerar o PDF
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
        alert('Por favor, permita pop-ups para gerar o PDF.');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${filename}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    background: white; 
                    color: #333;
                    padding: 20px;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            ${htmlContent}
            <div class="no-print" style="margin-top: 30px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                <p style="margin-bottom: 15px; color: #666;">Clique no botão abaixo para salvar como PDF:</p>
                <button onclick="window.print()" style="
                    padding: 12px 30px; 
                    font-size: 16px; 
                    background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    cursor: pointer;
                    font-weight: 600;
                ">📄 Salvar como PDF</button>
                <p style="margin-top: 10px; font-size: 12px; color: #999;">Na janela de impressão, selecione "Salvar como PDF" no destino</p>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    console.log('Janela de PDF aberta com sucesso!');
}

// Função para visualizar documento antes de gerar
function previewDocument(htmlContent, title) {
    // Criar modal de preview
    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        max-width: 800px;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        padding: 15px 20px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 12px 12px 0 0;
    `;
    header.innerHTML = `
        <h3 style="margin:0;">📄 ${title}</h3>
        <button id="close-preview" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;">✕ Fechar</button>
    `;

    const body = document.createElement('div');
    body.style.cssText = 'padding: 20px; color: #333;';
    body.innerHTML = htmlContent;

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Fechar ao clicar no botão ou fora
    document.getElementById('close-preview').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function updateStats(type) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Get current value and increment
        const snapshot = await db.ref('users/' + user.uid + '/stats/' + type).once('value');
        const currentValue = snapshot.val() || 0;
        await db.ref('users/' + user.uid + '/stats/' + type).set(currentValue + 1);

        // Update UI
        const statElement = document.getElementById(`stat${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (statElement) {
            statElement.textContent = currentValue + 1;
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '___/___/______';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function valorPorExtenso(valor) {
    if (valor === 0) return 'zero reais';

    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    function extenso999(n) {
        if (n === 0) return '';
        if (n === 100) return 'cem';

        let resultado = '';
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (c > 0) resultado += centenas[c];

        if (d === 1) {
            if (resultado) resultado += ' e ';
            resultado += especiais[u];
        } else {
            if (d > 0) {
                if (resultado) resultado += ' e ';
                resultado += dezenas[d];
            }
            if (u > 0) {
                if (resultado) resultado += ' e ';
                resultado += unidades[u];
            }
        }

        return resultado;
    }

    const inteiro = Math.floor(valor);
    const centavos = Math.round((valor - inteiro) * 100);

    let resultado = '';

    if (inteiro >= 1000000) {
        const milhoes = Math.floor(inteiro / 1000000);
        resultado += extenso999(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
    }

    const resto = inteiro % 1000000;
    if (resto >= 1000) {
        const milhares = Math.floor(resto / 1000);
        if (resultado) resultado += ', ';
        resultado += extenso999(milhares) + ' mil';
    }

    const unidade = resto % 1000;
    if (unidade > 0) {
        if (resultado) resultado += ' e ';
        resultado += extenso999(unidade);
    }

    if (inteiro === 1) {
        resultado += ' real';
    } else if (inteiro > 0) {
        resultado += ' reais';
    }

    if (centavos > 0) {
        if (resultado) resultado += ' e ';
        resultado += extenso999(centavos);
        resultado += centavos === 1 ? ' centavo' : ' centavos';
    }

    return resultado || 'zero reais';
}

// ===============================
// HISTÓRICO DE DOCUMENTOS
// ===============================

// Salvar documento no histórico
async function saveToHistory(type, title, description, valor, fullData = {}) {
    const user = auth.currentUser;
    if (!user) return;

    const docData = {
        type: type,
        title: title,
        description: description,
        valor: valor || 0,
        fullData: fullData,
        createdAt: Date.now(),
        createdAtFormatted: new Date().toLocaleDateString('pt-BR')
    };

    try {
        const newDocRef = db.ref('users/' + user.uid + '/documents').push();
        await newDocRef.set(docData);
        console.log('Documento salvo no histórico:', docData.title);

        // Atualizar visualização se estiver no histórico e visível
        if (typeof loadDocumentHistory === 'function') {
            const historySection = document.getElementById('historico-section');
            if (historySection && historySection.style.display !== 'none') {
                loadDocumentHistory(document.getElementById('filterTipo').value);
            }
        }
    } catch (error) {
        console.error('Erro ao salvar documento:', error);
    }
}

// Carregar histórico de documentos
async function loadDocumentHistory(filterType = 'todos') {
    const user = auth.currentUser;
    if (!user) return;

    const container = document.getElementById('listaDocumentos');
    container.innerHTML = '<p class="empty-message">Carregando documentos...</p>';

    try {
        const snapshot = await db.ref('users/' + user.uid + '/documents').once('value');
        const documents = snapshot.val();

        if (!documents) {
            container.innerHTML = '<p class="empty-message">Nenhum documento encontrado. Comece gerando uma proposta, contrato ou recibo!</p>';
            return;
        }

        // Converter para array e ordenar por data (mais recente primeiro)
        let docsArray = Object.entries(documents).map(([id, doc]) => ({ id, ...doc }));
        docsArray.sort((a, b) => b.createdAt - a.createdAt);

        // Filtrar por tipo se necessário
        if (filterType !== 'todos') {
            docsArray = docsArray.filter(doc => doc.type === filterType);
        }

        if (docsArray.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhum documento encontrado para este filtro.</p>';
            return;
        }

        // Renderizar documentos
        container.innerHTML = docsArray.map(doc => renderDocumentCard(doc)).join('');

        // Adicionar event listeners para os botões
        setupDocumentActions();

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        container.innerHTML = '<p class="empty-message">Erro ao carregar documentos. Tente novamente.</p>';
    }
}

// Renderizar card do documento
function renderDocumentCard(doc) {
    const icons = {
        proposta: '📋',
        contrato: '📄',
        recibo: '🧾'
    };

    const icon = icons[doc.type] || '📁';
    const badgeClass = doc.type;
    const valorFormatted = doc.valor ? `R$ ${parseFloat(doc.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';

    // Botão de editar só aparece se houver dados salvos (fullData)
    // Usamos aspas simples no onclick para envolver o ID que está em aspas duplas
    const editButton = doc.fullData
        ? `<button class="btn-icon-small primary" onclick="editDocument('${doc.id}')" title="Editar">✏️</button>`
        : '';

    return `
        <div class="document-card" data-id="${doc.id}">
            <div class="document-info">
                <div class="document-icon">${icon}</div>
                <div class="document-details">
                    <h4>${doc.title || 'Documento'} <span class="document-type-badge ${badgeClass}">${doc.type}</span></h4>
                    <p>${doc.description || ''}</p>
                </div>
            </div>
            <div class="document-meta">
                <span>${doc.createdAtFormatted || ''}</span>
                <span>${valorFormatted}</span>
            </div>
            <div class="document-actions">
                ${editButton}
                <button class="btn-icon-small danger" onclick="deleteDocument('${doc.id}')" title="Excluir">🗑️</button>
            </div>
        </div>
    `;
}

// Editar documento
async function editDocument(docId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await db.ref('users/' + user.uid + '/documents/' + docId).once('value');
        const doc = snapshot.val();

        if (!doc || !doc.fullData) {
            alert('Este documento não possui dados salvos para edição (documento antigo).');
            return;
        }

        const data = doc.fullData;

        // Navegar para a seção correta e preencher dados
        if (doc.type === 'proposta') {
            if (data.clienteNome) document.getElementById('clienteNome').value = data.clienteNome;
            if (data.clienteEmpresa) document.getElementById('clienteEmpresa').value = data.clienteEmpresa;
            if (data.clienteTelefone) document.getElementById('clienteTelefone').value = data.clienteTelefone;
            if (data.projetoTitulo) document.getElementById('projetoTitulo').value = data.projetoTitulo;
            if (data.projetoDescricao) document.getElementById('projetoDescricao').value = data.projetoDescricao;
            if (data.projetoValor) document.getElementById('projetoValor').value = formatMoney(data.projetoValor.toString());
            if (data.projetoPrazo) document.getElementById('projetoPrazo').value = data.projetoPrazo;
            if (data.projetoPagamento) document.getElementById('projetoPagamento').value = data.projetoPagamento;
            if (data.projetoValidade) document.getElementById('projetoValidade').value = data.projetoValidade;

            // Navegar
            const btn = document.querySelector('.sidebar-menu button[data-section="propostas"]');
            if (btn) btn.click(); else showSection('propostasSection');

        } else if (doc.type === 'contrato') {
            if (data.contratanteNome) document.getElementById('contratanteNome').value = data.contratanteNome;
            if (data.contratanteCpfCnpj) document.getElementById('contratanteCpfCnpj').value = data.contratanteCpfCnpj;
            if (data.contratanteEndereco) document.getElementById('contratanteEndereco').value = data.contratanteEndereco;
            if (data.contratoObjeto) document.getElementById('contratoObjeto').value = data.contratoObjeto;
            if (data.contratoValor) document.getElementById('contratoValor').value = formatMoney(data.contratoValor.toString());
            if (data.contratoPagamento) document.getElementById('contratoPagamento').value = data.contratoPagamento;
            if (data.contratoInicio) document.getElementById('contratoInicio').value = data.contratoInicio;
            if (data.contratoFim) document.getElementById('contratoFim').value = data.contratoFim;

            const btn = document.querySelector('.sidebar-menu button[data-section="contratos"]');
            if (btn) btn.click(); else showSection('contratosSection');

        } else if (doc.type === 'recibo') {
            if (data.reciboValor) document.getElementById('reciboValor').value = formatMoney(data.reciboValor.toString());
            if (data.reciboData) document.getElementById('reciboData').value = data.reciboData;
            if (data.reciboReferente) document.getElementById('reciboReferente').value = data.reciboReferente;
            if (data.pagadorNome) document.getElementById('pagadorNome').value = data.pagadorNome;
            if (data.pagadorCpfCnpj) document.getElementById('pagadorCpfCnpj').value = data.pagadorCpfCnpj;

            setTimeout(() => {
                const event = new Event('input');
                document.getElementById('reciboValor').dispatchEvent(event);
            }, 100);

            const btn = document.querySelector('.sidebar-menu button[data-section="recibos"]');
            if (btn) btn.click(); else showSection('recibosSection');
        }

        window.scrollTo(0, 0);

        // Feedback visual
        // Vamos dar um tempo para a seção renderizar antes de buscar o painel
        setTimeout(() => {
            const activeSection = document.querySelector('.section-panel.active');
            if (activeSection) {
                // Tenta achar form-card ou form-panel (dependendo do HTML, app.html tem form-card)
                const formCard = activeSection.querySelector('.form-card');
                if (formCard) {
                    formCard.scrollIntoView({ behavior: 'smooth' });
                    formCard.style.transition = 'box-shadow 0.5s ease';
                    formCard.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5)'; // Roxo primary
                    setTimeout(() => {
                        formCard.style.boxShadow = '';
                    }, 2000);
                }
            }
        }, 300);

    } catch (error) {
        console.error('Erro ao buscar documento para edição:', error);
        alert('Erro ao carregar documento.');
    }
}

// Helper para trocar seção programaticamente caso o click falhe
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section-panel');
    sections.forEach(s => s.classList.remove('active'));

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');

        // Atualizar menu
        // sectionId ex: propostasSection -> data-section: propostas
        const sectionName = sectionId.replace('Section', '');

        document.querySelectorAll('.sidebar-menu button').forEach(b => b.classList.remove('active'));
        const menuBtn = document.querySelector(`.sidebar-menu button[data-section="${sectionName}"]`);
        if (menuBtn) menuBtn.classList.add('active');
    }
}

// Deletar documento
async function deleteDocument(docId) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.ref('users/' + user.uid + '/documents/' + docId).remove();
        // Recarregar lista
        const filtroSelect = document.getElementById('filtroTipo');
        const filtro = filtroSelect ? filtroSelect.value : 'todos';
        loadDocumentHistory(filtro);
    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        alert('Erro ao excluir documento. Tente novamente.');
    }
}

// Setup dos botões de ação dos documentos
function setupDocumentActions() {
    // Os event listeners são configurados inline via onclick no HTML
}

// Setup do filtro e carregamento inicial do histórico
function setupHistorico() {
    // Tenta pegar pelo ID que pode variar dependendo do histórico de edições manuais
    // O mais provável é 'filterTipo' baseado em códigos anteriores
    const filtroSelect = document.getElementById('filterTipo') || document.getElementById('filtroTipo');

    if (filtroSelect) {
        // Garantir ID correto para futuras referencias
        filtroSelect.id = 'filterTipo';

        filtroSelect.addEventListener('change', (e) => {
            loadDocumentHistory(e.target.value);
        });
    }

    // Carregar documentos quando a seção for acessada
    const historicoBtn = document.querySelector('button[data-section="historico"]');
    if (historicoBtn) {
        historicoBtn.addEventListener('click', () => {
            const select = document.getElementById('filterTipo');
            const val = select ? select.value : 'todos';
            loadDocumentHistory(val);
        });
    }
}
