(function () {
    "use strict";
 
    let cotizaciones = {
        blue: { compra: 0, venta: 0 },
        oficial: { compra: 0, venta: 0 },
        mep: { compra: 0, venta: 0 },
        ccl: { compra: 0, venta: 0 },
        tarjeta: { compra: 0, venta: 0 },
        cripto: { compra: 0, venta: 0 }
    };
 
    let isUsdToArs = true;
 
    // ========================================
    // CARGAR COTIZACIONES - ENDPOINT CORRECTO
    // ========================================
    
    async function cargarCotizaciones() {
        const loader = document.getElementById('ultima-actualizacion');
        console.log('🚀 Iniciando carga de cotizaciones...');
        
        try {
            console.log('📡 Fetching /api/dolares...');
            const response = await fetch('/api/dolares');
            
            if (!response.ok) throw new Error('Error HTTP');
            
            const data = await response.json();
            console.log('✅ Datos obtenidos:', data);
 
            // Asignar directamente (la API ya tiene la estructura correcta)
            cotizaciones = {
                blue: data.blue,
                oficial: data.oficial,
                mep: data.mep,
                ccl: data.ccl,
                tarjeta: data.tarjeta,
                cripto: data.cripto
            };
 
            // Guardar en cache
            localStorage.setItem('cotizaciones_cache', JSON.stringify({
                data: cotizaciones,
                timestamp: new Date().toISOString()
            }));
 
            // Actualizar UI
            console.log('✅ Actualizando UI...');
            actualizarUI();
            console.log('✅ UI actualizada');
 
            // Timestamp
            if (loader) {
                const ahora = new Date();
                const hora = ahora.toLocaleTimeString('es-AR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                loader.textContent = `Última actualización: ${hora} (hace 0 min)`;
                loader.style.display = 'flex';
            }
 
        } catch (error) {
            console.error('❌ Error al cargar cotizaciones:', error);
            
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
                console.error('❌ Error al cargar cache:', cacheError);
                if (loader) loader.textContent = 'Error al cargar datos';
            }
        }
    }
 
    // ========================================
    // ACTUALIZAR UI
    // ========================================
    
    function actualizarUI() {
        // Actualizar valores (ahora TODAS tienen compra y venta)
        actualizarCotizacion('blue', cotizaciones.blue);
        actualizarCotizacion('oficial', cotizaciones.oficial);
        actualizarCotizacion('mep', cotizaciones.mep);
        actualizarCotizacion('ccl', cotizaciones.ccl);
        actualizarCotizacion('tarjeta', cotizaciones.tarjeta);
        actualizarCotizacion('cripto', cotizaciones.cripto);
 
        // Actualizar variaciones
        actualizarVariaciones();
 
        // Actualizar banner
        actualizarBanner();
 
        // Actualizar brecha
        actualizarBrecha();
    }
 
    function actualizarCotizacion(tipo, valores) {
        // Venta
        const ventaElem = document.getElementById(`${tipo}-valor`);
        if (ventaElem && valores.venta) {
            ventaElem.textContent = formatPeso(valores.venta);
        }
 
        // Compra (TODAS las cotizaciones la tienen)
        const compraElem = document.getElementById(`${tipo}-compra`);
        if (compraElem && valores.compra) {
            compraElem.textContent = formatPeso(valores.compra);
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
            // Cache inteligente: solo cache-bust una vez por hora
            const ahora = Date.now();
            const unaHora = 60 * 60 * 1000;
            const ultimoFetch = parseInt(localStorage.getItem('historico_last_fetch') || '0');
            const cacheBust = (ahora - ultimoFetch > unaHora) ? `?_=${ahora}` : '';
            
            const response = await fetch(`https://raw.githubusercontent.com/LucianoGonzalez84/cuantoEsta/main/historico.json${cacheBust}`);
            const historico = await response.json();
            
            // Guardar timestamp del fetch exitoso
            if (cacheBust) {
                localStorage.setItem('historico_last_fetch', ahora.toString());
            }
            
            if (!historico.ultimas_cotizaciones || historico.ultimas_cotizaciones.length < 1) return;
 
            // USAR DATOS ACTUALES (cotizaciones) vs ÚLTIMO DÍA DEL HISTÓRICO
            const ayer = historico.ultimas_cotizaciones[historico.ultimas_cotizaciones.length - 1];
            const tipos = ['blue', 'oficial', 'mep', 'ccl', 'tarjeta', 'cripto'];
 
            tipos.forEach(tipo => {
                // Valor ACTUAL de la API (datos de HOY)
                const valorHoy = cotizaciones[tipo]?.venta;
                // Valor del HISTÓRICO (último snapshot, puede ser ayer)
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
        const elem = document.getElementById(`${tipo}-variacion`);
        if (!elem) return;
 
        const flecha = elem.querySelector('.variacion-flecha');
        const porcentaje = elem.querySelector('.variacion-porcentaje');
 
        if (variacion > 0) {
            // SUBE = ROJO (malo)
            flecha.textContent = '▲';
            porcentaje.textContent = `+${variacion.toFixed(2)}% vs ayer`;
            elem.className = 'cotizacion-variacion negativo'; // Rojo
        } else if (variacion < 0) {
            // BAJA = VERDE (bueno)
            flecha.textContent = '▼';
            porcentaje.textContent = `${variacion.toFixed(2)}% vs ayer`;
            elem.className = 'cotizacion-variacion positivo'; // Verde
        } else {
            flecha.textContent = '—';
            porcentaje.textContent = '0.00% vs ayer';
            elem.className = 'cotizacion-variacion neutro';
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
                const elem = document.querySelector(`#${c.nombre.toLowerCase()}-variacion .variacion-porcentaje`);
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
        const track = document.querySelector('.banner-track');
        const dots = document.querySelectorAll('.banner-dots .dot');
        
        // En desktop, limpiar todo y salir
        if (window.innerWidth > 768) {
            if (track) track.style.transform = 'translateX(0)';
            if (bannerInterval) {
                clearInterval(bannerInterval);
                bannerInterval = null;
            }
            return;
        }
 
        if (!track || dots.length === 0) {
            console.warn('⚠️ Banner carousel: elementos no encontrados');
            return;
        }
        
        console.log('📱 Banner carousel mobile iniciado');
 
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

