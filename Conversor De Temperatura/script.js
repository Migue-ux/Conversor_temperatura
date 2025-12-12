function toCelsius(v, from, fusao, ebulicao) {
    if (from === 'C') return v;
    if (from === 'F') return (v - 32) * 5 / 9;
    if (from === 'K') return v - 273.15;
    if (from === 'X' && isFinite(fusao) && isFinite(ebulicao) && ebulicao !== fusao) {
        return ((v - fusao) * 100 / (ebulicao - fusao));
    }
    return NaN;
}

function fromCelsius(c, to, fusao, ebulicao) {
    if (to === 'C') return c;
    if (to === 'F') return (c * 9 / 5) + 32;
    if (to === 'K') return c + 273.15;
    if (to === 'X' && isFinite(fusao) && isFinite(ebulicao) && ebulicao !== fusao) {
        return (c * (ebulicao - fusao) / 100) + fusao;
    }
    return NaN;
}

function mostrarPopup(html) {
    document.getElementById('resultado').innerHTML = html;
    document.getElementById('popup').style.display = 'flex';
}

function converter() {
    const valor = parseFloat(document.getElementById('valor').value);
    const de = document.getElementById('de').value;
    const para = document.getElementById('para').value;
    const nome = document.getElementById('nomeEscala').value;
    const sigla = document.getElementById('siglaEscala').value;
    const fusao = parseFloat(document.getElementById('fusao').value);
    const ebulicao = parseFloat(document.getElementById('ebulicao').value);

    const celsius = toCelsius(valor, de, fusao, ebulicao);

    const escalas = ['C', 'F', 'K', 'X'];
    let resultado = "<table><tr><th>Escala</th><th>Valor</th></tr>";

    if (para === 'all') {
        escalas.forEach(function (esc) {
            if (esc === de) return;
            const valorConvertido = fromCelsius(celsius, esc, fusao, ebulicao);
            if (!isNaN(valorConvertido)) {
                const label = esc === 'X' ? `${nome} (${sigla})` : esc;
                resultado += `<tr><td>${label}</td><td>${valorConvertido.toFixed(2)}</td></tr>`;
            }
        });
    } else {
        const valorConvertido = fromCelsius(celsius, para, fusao, ebulicao);
        const label = para === 'X' ? `${nome} (${sigla})` : para;
        if (!isNaN(valorConvertido)) {
            resultado += `<tr><td>${label}</td><td>${valorConvertido.toFixed(2)}</td></tr>`;
        } else {
            resultado += `<tr><td>Erro</td><td>Conversão inválida</td></tr>`;
        }
    }

    resultado += "</table>";
    mostrarPopup(resultado);
}