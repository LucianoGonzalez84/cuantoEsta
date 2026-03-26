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

    // ========================================
    // CARGAR COTIZACIONES - SIMPLE Y ROBUSTO
    // ========================================
    
    async function cargarCotizaciones() {
        const loader = document.getElementById('ultima-actualizacion');
        
        try {
            // Fetch de la API
            const [blue, oficial, mep, ccl, tarjeta, cripto] = await Promise.all([
                fetch('https://dolarapi.com/v1/dolares/blue').then(r => r.json()),
                fetch('https://dolarapi.com/v1/dolares/oficial').then(r => r.json()),
                fetch('https://dolarapi.com/v1/dolares/bolsa').then(r => r.json()),
                fetch('https://dolarapi.com/v1/dolares/contadoconliqui').then(r => r.json()),
                fetch('https://dolarapi.com/v1/dolares/tarjeta').then(r => r.json()),
                fetch('https://dolarapi.com/v1/cotizaciones/usd').then(r => r.json())
            ]);

            // Actualizar objeto
            cotizaciones = {
                blue: { compra: blue.compra, venta: blue.venta },
                oficial: { compra: oficial.compra, venta: oficial.venta },
                mep: { venta: mep.venta },
                ccl: { venta: ccl.venta },
                tarjeta: { venta: tarjeta.venta },
                cripto: { venta: cripto.blue }
            };

            // Guardar en cache (para fallback)
            localStorage.setItem('cotizaciones_cache', JSON.stringify({
                data: cotizaciones,
                timestamp: new Date().toISOString()
            }));

            // Actualizar UI
            actualizarUI();

            // Timestamp
            if (loader) {
                const ahora = new Date();
                loader.textContent = `Última actualización: ${ahora.toLocaleTimeString('es-AR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })} hs`;
            }

        } catch (error) {
            console.error('Error al cargar cotizaciones:', error);
            
            // FALLBACK: cargar desde cache
            try {
                const cached = localStorage.getItem('cotizaciones_cache');
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    cotizaciones = data;
                    actualizarUI();
                    
                    if (loader) {
                        const fecha = new Date(timestamp);
                        const hace = Math.floor((Date.now() - fecha.getTime()) / 60000);
                        loader.textContent = `Última actualización: hace ${hace} min`;
                    }
                }
            } catch (cacheError) {
                console.error('Error al cargar cache:', cacheError);
                if (loader) loader.textContent = 'Error al cargar datos';
            }
        }
    }

    // ========================================
    // ACTUALIZAR UI
    // ========================================
    
    function actualizarUI() {
        // Actualizar valores
        actualizarCotizacion('blue', cotizaciones.blue);
        actualizarCotizacion('oficial', cotizaciones.oficial);
        actualizarCotizacion('mep', { venta: cotizaciones.mep.venta });
        actualizarCotizacion('ccl', { venta: cotizaciones.ccl.venta });
        actualizarCotizacion('tarjeta', { venta: cotizaciones.tarjeta.venta });
        actualizarCotizacion('cripto', { venta: cotizaciones.cripto.venta });

        // Actualizar variaciones
        actualizarVariaciones();

        // Actualizar banner
        actualizarBanner();

        // Actualizar brecha
        actualizarBrecha();
    }

    function actualizarCotizacion(tipo, valores) {
        const ventaElem = document.querySelector(`#cotizacion-${tipo} .cotizacion-valor`);
        if (ventaElem && valores.venta) {
            ventaElem.textContent = formatPeso(valores.venta);
        }

        if (valores.compra) {
            const compraElem = document.querySelector(`#cotizacion-${tipo} .precio-valor-small`);
            if (compraElem) {
                compraElem.textContent = formatPeso(valores.compra);
            }
        }
    }

    function formatPeso(valor) {
        return '$' + valor.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // ========================================
    // VARIACIONES
    // ========================================
    
    async function actualizarVariaciones() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/LucianoGonzalez84/cuantoEsta/main/historico.json');
            const historico = await response.json();
            
            if (!historico.ultimas_cotizaciones || historico.ultimas_cotizaciones.length < 2) return;

            const hoy = historico.ultimas_cotizaciones[historico.ultimas_cotizaciones.length - 1];
            const ayer = historico.ultimas_cotizaciones[historico.ultimas_cotizaciones.length - 2];

            const tipos = ['blue', 'oficial', 'mep', 'ccl', 'tarjeta', 'cripto'];

            tipos.forEach(tipo => {
                const valorHoy = hoy[tipo]?.venta;
                const valorAyer = ayer[tipo]?.venta;

                if (valorHoy && valorAyer) {
                    const variacion = ((valorHoy - valorAyer) / valorAyer * 100);
                    mostrarVariacion(tipo, variacion);
                }
            });

        } catch (error) {
            console.error('Error al calcular variaciones:', error);
        }
    }

    function mostrarVariacion(tipo, variacion) {
        const elem = document.querySelector(`#cotizacion-${tipo} .cotizacion-variacion`);
        if (!elem) return;

        const flecha = elem.querySelector('.variacion-flecha');
        const porcentaje = elem.querySelector('.variacion-porcentaje');

        if (variacion > 0) {
            flecha.textContent = '▲';
            porcentaje.textContent = `+${variacion.toFixed(2)}%`;
            elem.className = 'cotizacion-variacion positiva';
        } else if (variacion < 0) {
            flecha.textContent = '▼';
            porcentaje.textContent = `${variacion.toFixed(2)}%`;
            elem.className = 'cotizacion-variacion negativa';
        } else {
            flecha.textContent = '—';
            porcentaje.textContent = '0.00%';
            elem.className = 'cotizacion-variacion neutral';
        }

        elem.style.display = 'flex';
    }

    // ========================================
    // BANNER
    // ========================================
    
    async function actualizarBanner() {
        const cotizacionesArray = [
            { nombre: 'Blue', valor: cotizaciones.blue.venta },
            { nombre: 'Oficial', valor: cotizaciones.oficial.venta },
            { nombre: 'MEP', valor: cotizaciones.mep.venta },
            { nombre: 'CCL', valor: cotizaciones.ccl.venta },
            { nombre: 'Tarjeta', valor: cotizaciones.tarjeta.venta },
            { nombre: 'Cripto', valor: cotizaciones.cripto.venta }
        ].filter(c => c.valor > 0);

        // Más barato
        const masBarato = cotizacionesArray.reduce((min, c) => c.valor < min.valor ? c : min);
        const elemBarato = document.getElementById('banner-barato');
        if (elemBarato) {
            elemBarato.textContent = `${masBarato.nombre} $${masBarato.valor.toFixed(2)}`;
        }

        // Más caro
        const masCaro = cotizacionesArray.reduce((max, c) => c.valor > max.valor ? c : max);
        const elemCaro = document.getElementById('banner-caro');
        if (elemCaro) {
            elemCaro.textContent = `${masCaro.nombre} $${masCaro.valor.toFixed(2)}`;
        }

        // Brecha
        if (cotizaciones.blue.venta > 0 && cotizaciones.oficial.venta > 0) {
            const brecha = ((cotizaciones.blue.venta - cotizaciones.oficial.venta) / cotizaciones.oficial.venta * 100);
            const elemBrecha = document.getElementById('banner-brecha');
            if (elemBrecha) {
                elemBrecha.textContent = `${brecha.toFixed(2)}%`;
            }
        }

        // Mayor suba/baja (leer de las cards)
        setTimeout(() => {
            const variaciones = cotizacionesArray.map(c => {
                const elem = document.querySelector(`#cotizacion-${c.nombre.toLowerCase()} .variacion-porcentaje`);
                if (elem) {
                    const valor = parseFloat(elem.textContent.replace('%', '').replace('+', ''));
                    return { nombre: c.nombre, variacion: valor };
                }
                return null;
            }).filter(v => v && !isNaN(v.variacion));

            const subas = variaciones.filter(v => v.variacion > 0);
            const bajas = variaciones.filter(v => v.variacion < 0);

            const elemSuba = document.getElementById('banner-suba');
            const elemBaja = document.getElementById('banner-baja');

            if (elemSuba) {
                if (subas.length > 0) {
                    const mayor = subas.reduce((max, v) => v.variacion > max.variacion ? v : max);
                    elemSuba.textContent = `${mayor.nombre} +${mayor.variacion.toFixed(2)}%`;
                } else {
                    elemSuba.textContent = '—';
                }
            }

            if (elemBaja) {
                if (bajas.length > 0) {
                    const mayor = bajas.reduce((min, v) => v.variacion < min.variacion ? v : min);
                    elemBaja.textContent = `${mayor.nombre} ${mayor.variacion.toFixed(2)}%`;
                } else {
                    elemBaja.textContent = '—';
                }
            }
        }, 500);
    }

    // ========================================
    // BRECHA
    // ========================================
    
    function actualizarBrecha() {
        if (cotizaciones.blue.venta > 0 && cotizaciones.oficial.venta > 0) {
            const brecha = ((cotizaciones.blue.venta - cotizaciones.oficial.venta) / cotizaciones.oficial.venta * 100);
            const elem = document.getElementById('brecha-valor');
            if (elem) {
                elem.textContent = `${brecha.toFixed(2)}%`;
            }
        }
    }

    // ========================================
    // CONVERSOR
    // ========================================
    
    const inputFrom = document.getElementById('input-from');
    const cotizacionSelect = document.getElementById('cotizacion-select');
    const swapBtn = document.getElementById('swap-btn');
    const conversionValue = document.getElementById('conversion-value');

    if (inputFrom && cotizacionSelect && conversionValue) {
        inputFrom.addEventListener('input', actualizarConversion);
        cotizacionSelect.addEventListener('change', actualizarConversion);

        if (swapBtn) {
            swapBtn.addEventListener('click', () => {
                isUsdToArs = !isUsdToArs;
                actualizarConversion();
            });
        }
    }

    function actualizarConversion() {
        const monto = parseFloat(inputFrom.value) || 0;
        const tipo = cotizacionSelect.value;
        const tasa = cotizaciones[tipo]?.venta || 0;

        if (isUsdToArs) {
            const resultado = monto * tasa;
            conversionValue.textContent = formatPeso(resultado);
        } else {
            const resultado = monto / tasa;
            conversionValue.textContent = '$' + resultado.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    }

    // ========================================
    // BANNER CARRUSEL (MOBILE)
    // ========================================
    
    let bannerSlide = 0;
    const bannerTotal = 5;
    let bannerInterval;

    function initBannerCarousel() {
        if (window.innerWidth > 768) {
            const track = document.querySelector('.banner-track');
            if (track) track.style.transform = 'translateX(0)';
            return;
        }

        const track = document.querySelector('.banner-track');
        const dots = document.querySelectorAll('.banner-dots .dot');
        if (!track || dots.length === 0) return;

        function goToSlide(index) {
            bannerSlide = index;
            track.style.transform = `translateX(${-bannerSlide * 100}%)`;
            dots.forEach((dot, i) => dot.classList.toggle('active', i === bannerSlide));
        }

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                goToSlide(i);
                clearInterval(bannerInterval);
                bannerInterval = setInterval(() => goToSlide((bannerSlide + 1) % bannerTotal), 3000);
            });
        });

        let touchStart = 0;
        track.addEventListener('touchstart', (e) => {
            touchStart = e.touches[0].screenX;
            clearInterval(bannerInterval);
        }, { passive: true });

        track.addEventListener('touchend', (e) => {
            const diff = touchStart - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 50) {
                goToSlide(diff > 0 ? Math.min(bannerSlide + 1, 4) : Math.max(bannerSlide - 1, 0));
            }
            bannerInterval = setInterval(() => goToSlide((bannerSlide + 1) % bannerTotal), 3000);
        }, { passive: true });

        bannerInterval = setInterval(() => goToSlide((bannerSlide + 1) % bannerTotal), 3000);
    }

    // ========================================
    // INICIALIZACIÓN
    // ========================================
    
    // Cargar inmediatamente
    cargarCotizaciones();

    // Actualizar cada 5 minutos
    setInterval(cargarCotizaciones, 5 * 60 * 1000);

    // Iniciar carrusel
    setTimeout(initBannerCarousel, 500);
    window.addEventListener('resize', () => setTimeout(initBannerCarousel, 250));

})();
