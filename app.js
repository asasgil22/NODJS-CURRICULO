const express = require('express');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'segredo-admin',
    resave: false,
    saveUninitialized: false
}));

// Configuração do Multer para Upload Seguro de Imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'perfil-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

function verificarAutenticacao(req, res, next) {
    if (req.session.logado) return next();
    res.redirect('/login');
}

app.get('/', (req, res) => {
    const dados = JSON.parse(fs.readFileSync('dados.json', 'utf8'));
    res.render('index', dados);
});

app.get('/login', (req, res) => res.render('login', { erro: null }));

// ROTA DE LOGIN ATUALIZADA: Padrão de segurança alterado
app.post('/login', (req, res) => {
    const dados = JSON.parse(fs.readFileSync('dados.json', 'utf8'));
    
    // Se a credencial existir no JSON usa ela, senão usa admin / Sog+123+#
    const usuarioSalvo = (dados.credenciais && dados.credenciais.usuario) ? dados.credenciais.usuario : 'admin';
    const senhaSalva = (dados.credenciais && dados.credenciais.senha) ? dados.credenciais.senha : 'Sog+123+#';

    if (req.body.usuario === usuarioSalvo && req.body.senha === senhaSalva) {
        req.session.logado = true;
        res.redirect('/admin');
    } else {
        res.render('login', { erro: 'Usuário ou senha incorretos!' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/admin', verificarAutenticacao, (req, res) => {
    const dados = JSON.parse(fs.readFileSync('dados.json', 'utf8'));
    res.render('admin', dados);
});

app.post('/admin', verificarAutenticacao, upload.single('foto'), (req, res) => {
    const body = req.body;
    let dados = JSON.parse(fs.readFileSync('dados.json', 'utf8'));

    // Atualiza campos simples
    dados.nome = body.nome;
    dados.cargo = body.cargo;
    dados.email = body.email;
    dados.telefoneExibicao = body.telefoneExibicao;
    dados.telefoneLink = body.telefoneLink;
    dados.localizacao = body.localizacao;

    // Atualiza Credenciais de Login
    if (!dados.credenciais) dados.credenciais = {};
    if (body.novo_usuario && body.nova_senha) {
        dados.credenciais.usuario = body.novo_usuario;
        dados.credenciais.senha = body.nova_senha;
    }

    // Se uma nova foto foi enviada, grava o caminho local no JSON
    if (req.file) {
        dados.fotoUrl = '/uploads/' + req.file.filename;
    }

    // Lógica das Tecnologias (Carrossel)
    if (body.tech_nome) {
        const nomes = Array.isArray(body.tech_nome) ? body.tech_nome : [body.tech_nome];
        const icones = Array.isArray(body.tech_icone) ? body.tech_icone : [body.tech_icone];
        
        dados.tecnologias = nomes.map((nome, i) => ({
            nome: nome,
            icone: icones[i]
        }));
    } else {
        dados.tecnologias = [];
    }

    // Lógica das Estatísticas (Cards de Destaque)
    if (body.stat_numero) {
        const numeros = Array.isArray(body.stat_numero) ? body.stat_numero : [body.stat_numero];
        const labels = Array.isArray(body.stat_label) ? body.stat_label : [body.stat_label];
        
        dados.estatisticas = numeros.map((num, i) => ({
            numero: num,
            label: labels[i]
        }));
    } else {
        dados.estatisticas = [];
    }

    // Lógica para Foco de Atuação
    if (body.atuacao_nome) {
        const nomes = Array.isArray(body.atuacao_nome) ? body.atuacao_nome : [body.atuacao_nome];
        const valores = Array.isArray(body.atuacao_valor) ? body.atuacao_valor : [body.atuacao_valor];
        dados.atuacao = nomes.map((nome, i) => ({ nome: nome, valor: parseInt(valores[i]) }));
    }

    // Atualiza JSONs Complexos
    try {
        if (body.experiencias) dados.experiencias = JSON.parse(body.experiencias);
        if (body.formacao) dados.formacao = JSON.parse(body.formacao);
        if (body.extracurricular) dados.extracurricular = JSON.parse(body.extracurricular);
        if (!body.atuacao_nome && body.atuacao) dados.atuacao = JSON.parse(body.atuacao);
        if (body.comportamental) dados.comportamental = JSON.parse(body.comportamental);
        if (body.proficiencia) dados.proficiencia = JSON.parse(body.proficiencia);
    } catch (err) {
        console.error("Erro ao fazer parse de campos JSON complexos:", err);
    }

    fs.writeFileSync('dados.json', JSON.stringify(dados, null, 2));
    res.redirect('/');
});

app.listen(3000, () => console.log('Servidor em http://localhost:3000'));