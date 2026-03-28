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
    // CARGAR COTIZACIONES - SIN CACHE PROBLEMS
    // ========================================
    
    async function cargarCotizaciones() {
        const loader = document.getElementById('last-update');
        console.log('🚀 Iniciando carga de cotizaciones...');
        
        try {
            console.log('📡 Fetching /api/dolares...');
            
            // SOLUCIÓN: Agregar cache-bust SIEMPRE para evitar problemas
            const timestamp = Date.now();
            const response = await fetch(`/api/dolares?_=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
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
 
            // Actualizar UI
            console.log('✅ Actualizando UI...');
            actualizarUI();
            console.log('✅ UI actualizada');
            
            // Actualizar banner DESPUÉS de tener datos
            await actualizarBanner();
 
            // Timestamp
            if (loader) {
                const ahora = new Date();
                const hora = ahora.toLocaleTimeString('es-AR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                loader.textContent = `${hora} (hace 0 min)`;
                loader.style.display = 'flex';
            }
 
        } catch (error) {
            console.error('❌ Error al cargar cotizaciones:', error);
            if (loader) loader.textContent = 'Error al cargar datos';
        }
    }
 
    // ========================================
    // ACTUALIZAR UI
    // ========================================
    
    function actualizarUI() {
        // Actualizar valores
        actualizarCotizacion('blue', cotizaciones.blue);
        actualizarCotizacion('oficial', cotizaciones.oficial);
        actualizarCotizacion('mep', cotizaciones.mep);
        actualizarCotizacion('ccl', cotizaciones.ccl);
        actualizarCotizacion('tarjeta', cotizaciones.tarjeta);
        actualizarCotizacion('cripto', cotizaciones.cripto);
 
        // Actualizar brecha
        actualizarBrecha();
        
        // Actualizar variaciones
        actualizarVariaciones();
    }
 
    function actualizarCotizacion(tipo, valores) {
        // Venta
        const ventaElem = document.getElementById(`${tipo}-valor`);
        if (ventaElem && valores.venta) {
            ventaElem.textContent = formatPeso(valores.venta);
        }
 
        // Compra
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
    // VARIACIONES - SIN CACHE PROBLEMS
    // ========================================
    
    async function actualizarVariaciones() {
        try {
            // SOLUCIÓN: Cache-bust SIEMPRE para el histórico también
            const timestamp = Date.now();
            const response = await fetch(`https://raw.githubusercontent.com/LucianoGonzalez84/cuantoEsta/main/historico.json?_=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            const historico = await response.json();
            
            if (!historico.ultimas_cotizaciones || historico.ultimas_cotizaciones.length < 1) return;
 
            // USAR DATOS ACTUALES (cotizaciones) vs ÚLTIMO DÍA DEL HISTÓRICO
            const ayer = historico.ultimas_cotizaciones[historico.ultimas_cotizaciones.length - 1];
            const tipos = ['blue', 'oficial', 'mep', 'ccl', 'tarjeta', 'cripto'];
 
            tipos.forEach(tipo => {
                const valorHoy = cotizaciones[tipo]?.venta;
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
            // SUBE = ROJO (malo para quien tiene pesos)
            flecha.textContent = '▲';
            porcentaje.textContent = `+${variacion.toFixed(2)}% vs ayer`;
            elem.className = 'cotizacion-variacion negativo';
        } else if (variacion < 0) {
            // BAJA = VERDE (bueno para quien tiene pesos)
            flecha.textContent = '▼';
            porcentaje.textContent = `${variacion.toFixed(2)}% vs ayer`;
            elem.className = 'cotizacion-variacion positivo';
        } else {
            flecha.textContent = '—';
            porcentaje.textContent = '0.00% vs ayer';
            elem.className = 'cotizacion-variacion neutro';
        }
 
        elem.style.display = 'flex';
    }
 
    // ========================================
    // BRECHA CAMBIARIA
    // ========================================
    
    function actualizarBrecha() {
        const brechaElem = document.getElementById('brecha-porcentaje');
        if (!brechaElem) return;
 
        const blue = cotizaciones.blue?.venta || 0;
        const oficial = cotizaciones.oficial?.venta || 0;
 
        if (blue && oficial) {
            const brecha = ((blue - oficial) / oficial * 100);
            brechaElem.textContent = brecha.toFixed(1) + '%';
        }
    }
 
    // ========================================
    // BANNER INFO RÁPIDA
    // ========================================
    
    async function actualizarBanner() {
        console.log('🎨 Actualizando banner con cotizaciones:', cotizaciones);
        
        const valores = Object.entries(cotizaciones).map(([nombre, datos]) => ({
            nombre,
            venta: datos.venta || 0
        }));
 
        // Más barato
        const masBarato = valores.reduce((min, curr) => 
            curr.venta < min.venta && curr.venta > 0 ? curr : min
        );
        document.getElementById('banner-barato').textContent = 
            `${masBarato.nombre.toUpperCase()} $${masBarato.venta.toFixed(2)}`;
 
        // Más caro
        const masCaro = valores.reduce((max, curr) => 
            curr.venta > max.venta ? curr : max
        );
        document.getElementById('banner-caro').textContent = 
            `${masCaro.nombre.toUpperCase()} $${masCaro.venta.toFixed(2)}`;
 
        // Variaciones para mayor suba/baja
        try {
            const timestamp = Date.now();
            const response = await fetch(`https://raw.githubusercontent.com/LucianoGonzalez84/cuantoEsta/main/historico.json?_=${timestamp}`, {
                cache: 'no-store'
            });
            const historico = await response.json();
            
            if (historico.ultimas_cotizaciones && historico.ultimas_cotizaciones.length > 0) {
                const ayer = historico.ultimas_cotizaciones[historico.ultimas_cotizaciones.length - 1];
                
                let mayorSuba = { nombre: '', valor: -Infinity };
                let mayorBaja = { nombre: '', valor: Infinity };
                
                Object.keys(cotizaciones).forEach(tipo => {
                    const hoy = cotizaciones[tipo]?.venta;
                    const ayerVal = ayer[tipo]?.venta;
                    
                    if (hoy && ayerVal) {
                        const variacion = ((hoy - ayerVal) / ayerVal * 100);
                        
                        if (variacion > mayorSuba.valor) {
                            mayorSuba = { nombre: tipo, valor: variacion };
                        }
                        if (variacion < mayorBaja.valor) {
                            mayorBaja = { nombre: tipo, valor: variacion };
                        }
                    }
                });
                
                document.getElementById('banner-suba').textContent = 
                    `${mayorSuba.nombre.toUpperCase()} +${mayorSuba.valor.toFixed(2)}%`;
                document.getElementById('banner-baja').textContent = 
                    `${mayorBaja.nombre.toUpperCase()} ${mayorBaja.valor.toFixed(2)}%`;
            }
        } catch (error) {
            console.error('Error al calcular variaciones del banner:', error);
        }
 
        // Brecha
        const blue = cotizaciones.blue?.venta || 0;
        const oficial = cotizaciones.oficial?.venta || 0;
        if (blue && oficial) {
            const brecha = ((blue - oficial) / oficial * 100);
            document.getElementById('banner-brecha').textContent = `${brecha.toFixed(1)}%`;
        }
    }
 
    // ========================================
    // CONVERSOR
    // ========================================
    
    function initConversor() {
        const inputFrom = document.getElementById('input-from');
        const cotizacionSelect = document.getElementById('cotizacion-select');
        const swapBtn = document.getElementById('swap-btn');
        const resultValue = document.getElementById('conversion-value');
 
        function convertir() {
            const monto = parseFloat(inputFrom.value) || 0;
            const tipoCotizacion = cotizacionSelect.value;
            const cotizacion = cotizaciones[tipoCotizacion]?.venta || 0;
 
            let resultado;
            if (isUsdToArs) {
                resultado = monto * cotizacion;
            } else {
                resultado = monto / cotizacion;
            }
 
            resultValue.textContent = isUsdToArs 
                ? formatPeso(resultado)
                : `USD ${resultado.toFixed(2)}`;
        }
 
        inputFrom?.addEventListener('input', convertir);
        cotizacionSelect?.addEventListener('change', convertir);
        
        swapBtn?.addEventListener('click', () => {
            isUsdToArs = !isUsdToArs;
            document.getElementById('label-from').textContent = isUsdToArs ? 'USD Dólares' : 'ARS Pesos';
            document.getElementById('symbol-from').textContent = isUsdToArs ? '$' : '$';
            convertir();
        });
    }
 
    // ========================================
    // CARRUSEL BANNER (Mobile)
    // ========================================
    
    let bannerSlide = 0;
    let bannerInterval;
 
    function initBannerCarousel() {
        const track = document.querySelector('.banner-track');
        const items = document.querySelectorAll('.banner-item');
        const dots = document.querySelectorAll('.banner-dots .dot');
        const bannerTotal = items.length;
 
        if (!track || items.length === 0) return;
        if (bannerInterval) clearInterval(bannerInterval);
 
        function goToSlide(index) {
            bannerSlide = index;
            const offset = -index * 100;
            track.style.transform = `translateX(${offset}%)`;
            
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
 
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                if (bannerInterval) clearInterval(bannerInterval);
                goToSlide(index);
                bannerInterval = setInterval(() => {
                    goToSlide((bannerSlide + 1) % bannerTotal);
                }, 3000);
            });
        });
 
        // Swipe
        let touchStartX = 0;
        track.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].screenX;
            if (bannerInterval) clearInterval(bannerInterval);
        }, { passive: true });
 
        track.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0 && bannerSlide < bannerTotal - 1) {
                    goToSlide(bannerSlide + 1);
                } else if (diff < 0 && bannerSlide > 0) {
                    goToSlide(bannerSlide - 1);
                }
            }
            
            bannerInterval = setInterval(() => {
                goToSlide((bannerSlide + 1) % bannerTotal);
            }, 3000);
        }, { passive: true });
 
        // Autoplay
        goToSlide(0);
        bannerInterval = setInterval(() => {
            goToSlide((bannerSlide + 1) % bannerTotal);
        }, 3000);
    }
 
    // ========================================
    // INICIALIZACIÓN
    // ========================================
    
    // Cargar inmediatamente
    cargarCotizaciones();
 
    // Actualizar cada 5 minutos
    setInterval(cargarCotizaciones, 5 * 60 * 1000);
 
    // Iniciar conversor
    initConversor();
 
    // Iniciar carrusel
    setTimeout(initBannerCarousel, 500);
    window.addEventListener('resize', () => setTimeout(initBannerCarousel, 250));
 
})();
