
(function () {
    "use strict";

    let cotizaciones = {
        blue: { compra: 0, venta: 0 },
        oficial: { compra: 0, venta: 0 },
        mep: { venta: 0 },
        ccl: { venta: 0 },
        tarjeta: { venta: 0 },
        cripto: { venta: 0 }
    };

    let isUsdToArs = true;
    let valoresPrevios = {};

    let historicoCache = null;

    async function obtenerHistorico() {
        if (historicoCache) return historicoCache;

        try {
            const response = await fetch('https://raw.githubusercontent.com/LucianoGonzalez84/cuantoEsta/main/historico.json');
            const data = await response.json();
            historicoCache = data.ultimas_cotizaciones;
            return historicoCache;
        } catch {
            return [];
        }
    }

    // 🕒 FORMATEO HORA ARGENTINA (desde API)
    function formatearHoraArgentina(fechaISO) {
        try {
            const fecha = new Date(fechaISO);

            return new Intl.DateTimeFormat('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(fecha);

        } catch {
            return '--:--:--';
        }
    }

    function tiempoTranscurrido(fechaISO) {
        const ahora = new Date();
        const fecha = new Date(fechaISO);

        const diffMs = ahora - fecha;
        const diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 1) return 'recién';
        if (diffMin < 60) return `hace ${diffMin} min`;

        const diffHoras = Math.floor(diffMin / 60);
        return `hace ${diffHoras} hs`;
    }

    function actualizarUltimaActualizacion(fechaISO) {
        if (!fechaISO) return;

        const hora = formatearHoraArgentina(fechaISO);
        const hace = tiempoTranscurrido(fechaISO);

        document.getElementById('last-update').textContent =
            `${hora} hs (${hace})`;
    }

    async function mostrarVariaciones() {
        try {
            const historico = await obtenerHistorico();

            if (!historico || historico.length < 2) return;

            const actual = historico[historico.length - 1];

            function buscarAnteriorDistinto(tipo) {
                for (let i = historico.length - 2; i >= 0; i--) {
                    const valor = historico[i][tipo]?.venta;
                    if (valor && valor !== actual[tipo]?.venta) {
                        return valor;
                    }
                }
                return null;
            }

            const tipos = ['blue', 'oficial', 'mep', 'ccl', 'tarjeta', 'cripto'];

            tipos.forEach(tipo => {
                const valorActual = actual[tipo]?.venta;
                const valorAnterior = buscarAnteriorDistinto(tipo);

                if (valorActual == null || valorAnterior == null) return;
                if (valorAnterior === 0) return;

                const variacion = ((valorActual - valorAnterior) / valorAnterior * 100);

                const elemento = document.getElementById(`${tipo}-variacion`);
                if (!elemento) return;

                const flecha = elemento.querySelector('.variacion-flecha');
                const porcentaje = elemento.querySelector('.variacion-porcentaje');

                if (variacion > 0) {
                    elemento.className = 'cotizacion-variacion positiva';
                    flecha.textContent = '▲';
                    porcentaje.textContent = `+${variacion.toFixed(2)}%`;

                    // 🔥 ANIMACIÓN
                    elemento.classList.add('animar');
                    setTimeout(() => elemento.classList.remove('animar'), 500);
                } else if (variacion < 0) {
                    elemento.className = 'cotizacion-variacion negativa';
                    flecha.textContent = '▼';
                    porcentaje.textContent = `${variacion.toFixed(2)}%`;

                    // 🔥 ANIMACIÓN
                    elemento.classList.add('animar');
                    setTimeout(() => elemento.classList.remove('animar'), 500);
                } else {
                    elemento.className = 'cotizacion-variacion neutral';
                    flecha.textContent = '━';
                    porcentaje.textContent = '0.00%';
                }

                elemento.style.display = 'flex';
            });

        } catch (error) {
            console.error('Error en variaciones:', error);
        }
    }

    // 🚀 NUEVO FETCH (desde tu API)
    async function cargarCotizaciones() {
        try {
            const data = await fetch('/api/dolares').then(r => r.json());


            cotizaciones.blue = data.blue;
            cotizaciones.oficial = data.oficial;
            cotizaciones.mep = data.mep;
            cotizaciones.ccl = data.ccl;
            cotizaciones.tarjeta = data.tarjeta;
            cotizaciones.cripto = data.cripto;

            actualizarUI();
            document.title = `Dólar Blue $${cotizaciones.blue.venta} | Hoy en Argentina`;
            actualizarConversion();
            actualizarBrecha();
            actualizarBanner();
            actualizarUltimaActualizacion(data.blue.fechaActualizacion);
            mostrarVariaciones();


        } catch (error) {
            console.error('Error al cargar cotizaciones:', error);
            mostrarErrorFallback();
        }
    }

    // 🔥 BANNER (fix mayor suba)
    async function actualizarBanner() {
        const cotizacionesArray = [
            { nombre: 'Blue', valor: cotizaciones.blue.venta },
            { nombre: 'Oficial', valor: cotizaciones.oficial.venta },
            { nombre: 'MEP', valor: cotizaciones.mep.venta },
            { nombre: 'CCL', valor: cotizaciones.ccl.venta },
            { nombre: 'Tarjeta', valor: cotizaciones.tarjeta.venta },
            { nombre: 'Cripto', valor: cotizaciones.cripto.venta }
        ].filter(c => c.valor > 0);

        // 💸 Más barato
        const masBarato = cotizacionesArray.reduce((min, c) => c.valor < min.valor ? c : min);
        document.getElementById('banner-barato').textContent = `${masBarato.nombre} $${masBarato.valor.toFixed(2)}`;

        // 💰 Más caro
        const masCaro = cotizacionesArray.reduce((max, c) => c.valor > max.valor ? c : max);
        document.getElementById('banner-caro').textContent = `${masCaro.nombre} $${masCaro.valor.toFixed(2)}`;

        // 📊 Brecha
        if (cotizaciones.blue.venta > 0 && cotizaciones.oficial.venta > 0) {
            const brecha = ((cotizaciones.blue.venta - cotizaciones.oficial.venta) / cotizaciones.oficial.venta * 100);
            document.getElementById('banner-brecha').textContent = `${brecha.toFixed(2)}%`;
        }

        // 🔥 MAYOR SUBA Y BAJA
        try {
            const historico = await obtenerHistorico();

            if (!historico || historico.length < 2) {
                document.getElementById('banner-suba').textContent = 'Sin datos';
                document.getElementById('banner-baja').textContent = 'Sin datos';
                return;
            }

            const actual = historico[historico.length - 1];
            const anterior = historico[historico.length - 2];
            const tipos = ['blue', 'oficial', 'mep', 'ccl', 'tarjeta', 'cripto'];

            // --- AQUÍ ESTABA EL ERROR: Faltaba cerrar el .map() ---
            const variaciones = tipos.map(tipo => {
                const vActual = actual[tipo]?.venta;
                const vAnterior = anterior[tipo]?.venta;

                if (vActual && vAnterior) {
                    return {
                        nombre: tipo.charAt(0).toUpperCase() + tipo.slice(1),
                        variacion: ((vActual - vAnterior) / vAnterior) * 100
                    };
                }
                return null;
            }).filter(v => v !== null); // Cerramos el map y filtramos nulos

            // 🔺 MAYOR SUBA
            const subas = variaciones.filter(v => v.variacion > 0);
            let textoSuba = 'Sin subas';
            if (subas.length > 0) {
                const mayorSuba = subas.reduce((max, v) => v.variacion > max.variacion ? v : max);
                textoSuba = `${mayorSuba.nombre} +${mayorSuba.variacion.toFixed(2)}%`;
            }

            // 🔻 MAYOR BAJA
            const bajas = variaciones.filter(v => v.variacion < 0);
            let textoBaja = 'Sin bajas';
            if (bajas.length > 0) {
                const mayorBaja = bajas.reduce((min, v) => v.variacion < min.variacion ? v : min);
                textoBaja = `${mayorBaja.nombre} ${mayorBaja.variacion.toFixed(2)}%`;
            }

            // 📢 MOSTRAR EN EL BANNER
            document.getElementById('banner-suba').textContent = textoSuba;
            document.getElementById('banner-baja').textContent = textoBaja;

        } catch (error) {
            console.error('Error en mayor suba:', error);
        }
    } // Cerramos la función
    // UI
    function actualizarUI() {

        function actualizarElemento(id, nuevoValor, valorPrevio) {
            const el = document.getElementById(id);
            if (!el) return;

            el.textContent = formatPeso(nuevoValor);

            if (valorPrevio !== undefined) {
                if (nuevoValor > valorPrevio) {
                    el.classList.add('sube');
                } else if (nuevoValor < valorPrevio) {
                    el.classList.add('baja');
                }

                setTimeout(() => {
                    el.classList.remove('sube', 'baja');
                }, 800);
            }
        }

        // BLUE
        actualizarElemento('blue-valor', cotizaciones.blue.venta, valoresPrevios.blue);
        const blueCompra = document.getElementById('blue-compra');
        if (blueCompra) blueCompra.textContent = formatPeso(cotizaciones.blue.compra);
        valoresPrevios.blue = cotizaciones.blue.venta;

        // OFICIAL
        actualizarElemento('oficial-valor', cotizaciones.oficial.venta, valoresPrevios.oficial);
        const oficialCompra = document.getElementById('oficial-compra');
        if (oficialCompra) oficialCompra.textContent = formatPeso(cotizaciones.oficial.compra);
        valoresPrevios.oficial = cotizaciones.oficial.venta;

        // MEP
        actualizarElemento('mep-valor', cotizaciones.mep.venta, valoresPrevios.mep);
        const mepCompra = document.getElementById('mep-compra');
        if (mepCompra) {
            mepCompra.textContent =
                cotizaciones.mep.compra ? formatPeso(cotizaciones.mep.compra) : '-';
        }
        valoresPrevios.mep = cotizaciones.mep.venta;

        // CCL
        actualizarElemento('ccl-valor', cotizaciones.ccl.venta, valoresPrevios.ccl);
        const cclCompra = document.getElementById('ccl-compra');
        if (cclCompra) {
            cclCompra.textContent =
                cotizaciones.ccl.compra ? formatPeso(cotizaciones.ccl.compra) : '-';
        }
        valoresPrevios.ccl = cotizaciones.ccl.venta;

        // TARJETA
        actualizarElemento('tarjeta-valor', cotizaciones.tarjeta.venta, valoresPrevios.tarjeta);
        const tarjetaCompra = document.getElementById('tarjeta-compra');
        if (tarjetaCompra) tarjetaCompra.textContent = formatPeso(cotizaciones.tarjeta.compra);
        valoresPrevios.tarjeta = cotizaciones.tarjeta.venta;

        // CRIPTO
        actualizarElemento('cripto-valor', cotizaciones.cripto.venta, valoresPrevios.cripto);
        const criptoCompra = document.getElementById('cripto-compra');
        if (criptoCompra) {
            criptoCompra.textContent =
                cotizaciones.cripto.compra ? formatPeso(cotizaciones.cripto.compra) : '-';
        }
        valoresPrevios.cripto = cotizaciones.cripto.venta;
    }

    function formatPeso(valor) {
        return '$' + parseFloat(valor).toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function actualizarBrecha() {
        const blue = cotizaciones.blue.venta;
        const oficial = cotizaciones.oficial.venta;
        const brecha = ((blue - oficial) / oficial * 100).toFixed(2);
        document.getElementById('brecha-porcentaje').textContent = brecha + '%';
    }

    function mostrarErrorFallback() {
        document.querySelectorAll('.cotizacion-valor').forEach(el => {
            el.textContent = 'Error';
        });
    }

    // Conversor
    const inputFrom = document.getElementById('input-from');
    const cotizacionSelect = document.getElementById('cotizacion-select');
    const swapBtn = document.getElementById('swap-btn');
    const conversionValue = document.getElementById('conversion-value');

    inputFrom.addEventListener('input', actualizarConversion);
    cotizacionSelect.addEventListener('change', actualizarConversion);

    function actualizarConversion() {
        const monto = parseFloat(inputFrom.value) || 0;
        const tipo = cotizacionSelect.value;
        const tasa = cotizaciones[tipo]?.venta || 0;

        if (isUsdToArs) {
            conversionValue.textContent = formatPeso(monto * tasa);
        } else {
            conversionValue.textContent = '$' + (monto / tasa).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    }

    swapBtn.addEventListener('click', () => {
        isUsdToArs = !isUsdToArs;
        actualizarConversion();
    });


    // init
    cargarCotizaciones();
    setInterval(cargarCotizaciones, 5 * 60 * 1000);

})();

