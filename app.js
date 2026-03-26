
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
    let bannerInicializado = false;
    let bannerInterval = null;

    let historicoCache = null;

    const HASH_KEY = 'cotizaciones_hash';

    function generarHash(data) {
        return JSON.stringify(data);
    }

    function guardarHash(hash) {
        localStorage.setItem(HASH_KEY, hash);
    }

    function obtenerHash() {
        return localStorage.getItem(HASH_KEY);
    }

    const STORAGE_KEY = 'cotizaciones_historial';

    function guardarEnLocalStorage(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            console.warn('No se pudo guardar en localStorage');
        }
    }

    function obtenerDeLocalStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function usarFallbackLocal() {
        const guardado = obtenerDeLocalStorage();

        if (!guardado) {
            mostrarErrorFallback();
            return;
        }

        cotizaciones = guardado.data;

        actualizarUI();
        actualizarConversion();
        actualizarBrecha();

        console.warn('Usando datos offline');
    }

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
                    // 🔴 SUBE (rojo)
                    elemento.className = 'cotizacion-variacion sube';
                    flecha.textContent = '▲';
                    porcentaje.textContent = `+${variacion.toFixed(2)}%`;

                    elemento.classList.add('animar');
                    setTimeout(() => elemento.classList.remove('animar'), 500);

                } else if (variacion < 0) {
                    // 🟢 BAJA (verde)
                    elemento.className = 'cotizacion-variacion baja';
                    flecha.textContent = '▼';
                    porcentaje.textContent = `${variacion.toFixed(2)}%`;

                    elemento.classList.add('animar');
                    setTimeout(() => elemento.classList.remove('animar'), 500);

                } else {
                    // ⚪ NEUTRO
                    elemento.className = 'cotizacion-variacion neutro';
                    flecha.textContent = '━';
                    porcentaje.textContent = '0.00%';
                }

                elemento.style.display = 'flex';
            });

        } catch (error) {
            console.error('Error en variaciones:', error);
        }
    }

    let ultimaActualizacion = 0;

    async function cargarCotizaciones() {
        try {
            const ahora = Date.now();

            // ⛔ Evitar fetch demasiado seguido (1 min)
            if (ahora - ultimaActualizacion < 60000) {
                console.log('⏳ Esperando próximo fetch...');
                return;
            }

            ultimaActualizacion = ahora;

            const response = await fetch('/api/dolares');

            if (!response.ok) throw new Error('Error HTTP');

            const data = await response.json();

            const nuevasCotizaciones = {
                blue: data.blue,
                oficial: data.oficial,
                mep: data.mep,
                ccl: data.ccl,
                tarjeta: data.tarjeta,
                cripto: data.cripto
            };

            // 🔐 HASH (ETag mental)
            const nuevoHash = JSON.stringify(nuevasCotizaciones);
            const hashAnterior = localStorage.getItem('cotizaciones_hash');

            // 🧠 Si no cambió → no hacer nada
            if (nuevoHash === hashAnterior) {
                console.log('⏸️ Sin cambios, no se actualiza UI');
                return;
            }

            console.log('🔄 Cambios detectados, actualizando UI');

            // 📦 Obtener estado anterior (para animaciones)
            let anterior = null;
            try {
                const raw = localStorage.getItem('cotizaciones_historial');
                anterior = raw ? JSON.parse(raw).data : null;
            } catch {
                anterior = null;
            }

            // 🔄 Actualizar estado global
            cotizaciones = nuevasCotizaciones;

            // 💾 Guardar en localStorage
            try {
                localStorage.setItem('cotizaciones_historial', JSON.stringify({
                    data: cotizaciones,
                    timestamp: new Date().toISOString()
                }));
                localStorage.setItem('cotizaciones_hash', nuevoHash);
            } catch (e) {
                console.warn('No se pudo guardar en localStorage');
            }

            // 🎨 UI
            actualizarUI(anterior);
            actualizarConversion();
            actualizarBrecha();

            // 🔥 IMPORTANTE → esperar banner
            await actualizarBanner();

            // 🚀 Inicializar carousel SOLO una vez (y solo en mobile)
            if (!bannerInicializado && window.innerWidth <= 768) {
                iniciarBannerCarousel();
                bannerInicializado = true;
            }

            actualizarUltimaActualizacion(data.blue.fechaActualizacion);
            mostrarVariaciones();

        } catch (error) {
            console.error('Error al cargar cotizaciones:', error);

            // 🔌 Fallback offline
            try {
                const raw = localStorage.getItem('cotizaciones_historial');
                if (!raw) throw new Error('Sin datos locales');

                const guardado = JSON.parse(raw);
                cotizaciones = guardado.data;

                actualizarUI();
                actualizarConversion();
                actualizarBrecha();

                // 🔥 también mostramos banner offline
                await actualizarBanner();

                if (!bannerInicializado && window.innerWidth <= 768) {
                    iniciarBannerCarousel();
                    bannerInicializado = true;
                }

                console.warn('⚠️ Usando datos offline');

            } catch {
                mostrarErrorFallback();
            }
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
        document.getElementById('banner-barato').textContent =
            `${masBarato.nombre} $${masBarato.valor.toFixed(2)}`;

        // 💰 Más caro
        const masCaro = cotizacionesArray.reduce((max, c) => c.valor > max.valor ? c : max);
        document.getElementById('banner-caro').textContent =
            `${masCaro.nombre} $${masCaro.valor.toFixed(2)}`;

        // 📊 Brecha
        if (cotizaciones.blue.venta > 0 && cotizaciones.oficial.venta > 0) {
            const brecha = ((cotizaciones.blue.venta - cotizaciones.oficial.venta) / cotizaciones.oficial.venta * 100);
            document.getElementById('banner-brecha').textContent = `${brecha.toFixed(2)}%`;
        }

        // 🔥 SUBA / BAJA
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
            }).filter(Boolean);

            // 🔺 SUBA
            const subas = variaciones.filter(v => v.variacion > 0);
            let textoSuba = 'Sin subas';

            if (subas.length > 0) {
                const mayorSuba = subas.reduce((max, v) => v.variacion > max.variacion ? v : max);
                textoSuba = `${mayorSuba.nombre} +${mayorSuba.variacion.toFixed(2)}%`;
            }

            // 🔻 BAJA
            const bajas = variaciones.filter(v => v.variacion < 0);
            let textoBaja = 'Sin bajas';

            if (bajas.length > 0) {
                const mayorBaja = bajas.reduce((min, v) => v.variacion < min.variacion ? v : min);
                textoBaja = `${mayorBaja.nombre} ${mayorBaja.variacion.toFixed(2)}%`;
            }

            document.getElementById('banner-suba').textContent = textoSuba;
            document.getElementById('banner-baja').textContent = textoBaja;

        } catch (error) {
            console.error('Error en banner:', error);
        }
    }// Cerramos la función

    function iniciarBannerCarousel() {
        if (bannerInterval) return; // 🔒 evita múltiples intervalos

        const track = document.getElementById('info-track');
        const dotsContainer = document.getElementById('banner-dots');

        if (!track || !dotsContainer) return;

        const items = track.children;
        let index = 0;

        dotsContainer.innerHTML = '';

        for (let i = 0; i < items.length; i++) {
            const dot = document.createElement('div');
            dot.classList.add('banner-dot');
            if (i === 0) dot.classList.add('active');
            dotsContainer.appendChild(dot);
        }

        const dots = dotsContainer.children;

        function actualizarSlider() {
            track.style.transform = `translateX(-${index * 100}%)`;

            for (let i = 0; i < dots.length; i++) {
                dots[i].classList.remove('active');
            }

            if (dots[index]) {
                dots[index].classList.add('active');
            }
        }

        bannerInterval = setInterval(() => {
            index = (index + 1) % items.length;
            actualizarSlider();
        }, 3000);
    }

    function aplicarAnimacion(el, variacion) {
        const abs = Math.abs(variacion);

        // limpiar clases previas
        el.classList.remove('anim-suave', 'anim-media', 'anim-fuerte');

        if (abs < 0.1) return; // ruido → no animar

        if (abs < 0.5) {
            el.classList.add('anim-suave');
        } else if (abs < 1.5) {
            el.classList.add('anim-media');
        } else {
            el.classList.add('anim-fuerte');
        }

        setTimeout(() => {
            el.classList.remove('anim-suave', 'anim-media', 'anim-fuerte');
        }, 800);
    }

    // UI
    function actualizarUI(anterior = null) {

        function actualizarElemento(id, nuevoValor, valorPrevio) {
            const el = document.getElementById(id);
            if (!el) return;

            el.textContent = formatPeso(nuevoValor);

            // 👉 Solo animar si hay valor previo REAL
            if (valorPrevio !== undefined && valorPrevio !== null) {

                const variacion = ((nuevoValor - valorPrevio) / valorPrevio) * 100;

                if (nuevoValor > valorPrevio) {
                    el.classList.add('sube'); // 🔴
                } else if (nuevoValor < valorPrevio) {
                    el.classList.add('baja'); // 🟢
                }

                aplicarAnimacion(el, variacion);

                setTimeout(() => {
                    el.classList.remove('sube', 'baja');
                }, 800);
            }
        }

        // 🔵 BLUE
        actualizarElemento(
            'blue-valor',
            cotizaciones.blue.venta,
            anterior?.blue?.venta
        );

        const blueCompra = document.getElementById('blue-compra');
        if (blueCompra) {
            blueCompra.textContent = formatPeso(cotizaciones.blue.compra);
        }

        // 🏦 OFICIAL
        actualizarElemento(
            'oficial-valor',
            cotizaciones.oficial.venta,
            anterior?.oficial?.venta
        );

        const oficialCompra = document.getElementById('oficial-compra');
        if (oficialCompra) {
            oficialCompra.textContent = formatPeso(cotizaciones.oficial.compra);
        }

        // 💰 MEP
        actualizarElemento(
            'mep-valor',
            cotizaciones.mep.venta,
            anterior?.mep?.venta
        );

        const mepCompra = document.getElementById('mep-compra');
        if (mepCompra) {
            mepCompra.textContent = cotizaciones.mep.compra
                ? formatPeso(cotizaciones.mep.compra)
                : '-';
        }

        // 🌍 CCL
        actualizarElemento(
            'ccl-valor',
            cotizaciones.ccl.venta,
            anterior?.ccl?.venta
        );

        const cclCompra = document.getElementById('ccl-compra');
        if (cclCompra) {
            cclCompra.textContent = cotizaciones.ccl.compra
                ? formatPeso(cotizaciones.ccl.compra)
                : '-';
        }

        // 💳 TARJETA
        actualizarElemento(
            'tarjeta-valor',
            cotizaciones.tarjeta.venta,
            anterior?.tarjeta?.venta
        );

        const tarjetaCompra = document.getElementById('tarjeta-compra');
        if (tarjetaCompra) {
            tarjetaCompra.textContent = formatPeso(cotizaciones.tarjeta.compra);
        }

        // 🪙 CRIPTO
        actualizarElemento(
            'cripto-valor',
            cotizaciones.cripto.venta,
            anterior?.cripto?.venta
        );

        const criptoCompra = document.getElementById('cripto-compra');
        if (criptoCompra) {
            criptoCompra.textContent = cotizaciones.cripto.compra
                ? formatPeso(cotizaciones.cripto.compra)
                : '-';
        }
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

        if (!blue || !oficial) return;

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

    if (inputFrom && cotizacionSelect && conversionValue) {
        inputFrom.addEventListener('input', actualizarConversion);
        cotizacionSelect.addEventListener('change', actualizarConversion);
    }

    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            isUsdToArs = !isUsdToArs;
            actualizarConversion();
        });
    }

    function actualizarConversion() {
        // 🔒 Guard clause: evitar errores si el DOM no está listo
        if (!inputFrom || !cotizacionSelect || !conversionValue) return;

        const monto = parseFloat(inputFrom.value);
        const tipo = cotizacionSelect.value;
        const tasa = cotizaciones[tipo]?.venta;

        // 🧠 Estado: input vacío
        if (isNaN(monto)) {
            conversionValue.textContent = '$0,00';
            return;
        }

        // 🧠 Estado: API aún no cargó o tasa inválida
        if (!tasa || tasa <= 0) {
            conversionValue.textContent = 'Cargando...';
            return;
        }

        let resultado;

        if (isUsdToArs) {
            // 💵 USD → ARS
            resultado = monto * tasa;

            conversionValue.textContent = formatPeso(resultado);
        } else {
            // 💸 ARS → USD
            resultado = monto / tasa;

            conversionValue.textContent =
                '$' + resultado.toLocaleString('en-US', {
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

