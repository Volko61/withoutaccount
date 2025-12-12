/**
 * Color Converter - WithoutAccount
 * Comprehensive color conversion tool with 60+ formats
 */

(function () {
    'use strict';

    // ============================================
    // NAMED COLORS DATABASE
    // ============================================
    const NAMED_COLORS = {
        // Reds
        'red': '#FF0000', 'darkred': '#8B0000', 'indianred': '#CD5C5C', 'lightcoral': '#F08080',
        'salmon': '#FA8072', 'darksalmon': '#E9967A', 'lightsalmon': '#FFA07A', 'crimson': '#DC143C',
        'firebrick': '#B22222', 'maroon': '#800000',
        // Oranges
        'orange': '#FFA500', 'darkorange': '#FF8C00', 'coral': '#FF7F50', 'tomato': '#FF6347',
        'orangered': '#FF4500',
        // Yellows
        'yellow': '#FFFF00', 'gold': '#FFD700', 'lightyellow': '#FFFFE0', 'lemonchiffon': '#FFFACD',
        'lightgoldenrodyellow': '#FAFAD2', 'papayawhip': '#FFEFD5', 'moccasin': '#FFE4B5',
        'peachpuff': '#FFDAB9', 'palegoldenrod': '#EEE8AA', 'khaki': '#F0E68C', 'darkkhaki': '#BDB76B',
        // Greens
        'green': '#008000', 'lime': '#00FF00', 'limegreen': '#32CD32', 'lightgreen': '#90EE90',
        'palegreen': '#98FB98', 'darkgreen': '#006400', 'forestgreen': '#228B22', 'seagreen': '#2E8B57',
        'mediumseagreen': '#3CB371', 'springgreen': '#00FF7F', 'mediumspringgreen': '#00FA9A',
        'mediumaquamarine': '#66CDAA', 'yellowgreen': '#9ACD32', 'lawngreen': '#7CFC00',
        'chartreuse': '#7FFF00', 'greenyellow': '#ADFF2F', 'olive': '#808000', 'olivedrab': '#6B8E23',
        'darkolivegreen': '#556B2F', 'teal': '#008080', 'darkcyan': '#008B8B',
        // Blues
        'blue': '#0000FF', 'navy': '#000080', 'darkblue': '#00008B', 'mediumblue': '#0000CD',
        'royalblue': '#4169E1', 'steelblue': '#4682B4', 'dodgerblue': '#1E90FF', 'deepskyblue': '#00BFFF',
        'cornflowerblue': '#6495ED', 'skyblue': '#87CEEB', 'lightskyblue': '#87CEFA',
        'lightsteelblue': '#B0C4DE', 'lightblue': '#ADD8E6', 'powderblue': '#B0E0E6',
        'cadetblue': '#5F9EA0', 'darkturquoise': '#00CED1', 'mediumturquoise': '#48D1CC',
        'turquoise': '#40E0D0', 'cyan': '#00FFFF', 'aqua': '#00FFFF', 'lightcyan': '#E0FFFF',
        'paleturquoise': '#AFEEEE', 'aquamarine': '#7FFFD4', 'midnightblue': '#191970',
        // Purples
        'purple': '#800080', 'indigo': '#4B0082', 'darkviolet': '#9400D3', 'darkorchid': '#9932CC',
        'darkmagenta': '#8B008B', 'blueviolet': '#8A2BE2', 'mediumpurple': '#9370DB',
        'mediumorchid': '#BA55D3', 'orchid': '#DA70D6', 'violet': '#EE82EE', 'plum': '#DDA0DD',
        'thistle': '#D8BFD8', 'lavender': '#E6E6FA', 'rebeccapurple': '#663399', 'slateblue': '#6A5ACD',
        'darkslateblue': '#483D8B', 'mediumslateblue': '#7B68EE', 'magenta': '#FF00FF', 'fuchsia': '#FF00FF',
        // Pinks
        'pink': '#FFC0CB', 'lightpink': '#FFB6C1', 'hotpink': '#FF69B4', 'deeppink': '#FF1493',
        'mediumvioletred': '#C71585', 'palevioletred': '#DB7093',
        // Browns
        'brown': '#A52A2A', 'saddlebrown': '#8B4513', 'sienna': '#A0522D', 'chocolate': '#D2691E',
        'peru': '#CD853F', 'sandybrown': '#F4A460', 'burlywood': '#DEB887', 'tan': '#D2B48C',
        'rosybrown': '#BC8F8F', 'goldenrod': '#DAA520', 'darkgoldenrod': '#B8860B',
        // Whites
        'white': '#FFFFFF', 'snow': '#FFFAFA', 'honeydew': '#F0FFF0', 'mintcream': '#F5FFFA',
        'azure': '#F0FFFF', 'aliceblue': '#F0F8FF', 'ghostwhite': '#F8F8FF', 'whitesmoke': '#F5F5F5',
        'seashell': '#FFF5EE', 'beige': '#F5F5DC', 'oldlace': '#FDF5E6', 'floralwhite': '#FFFAF0',
        'ivory': '#FFFFF0', 'antiquewhite': '#FAEBD7', 'linen': '#FAF0E6', 'lavenderblush': '#FFF0F5',
        'mistyrose': '#FFE4E1', 'blanchedalmond': '#FFEBCD', 'bisque': '#FFE4C4', 'navajowhite': '#FFDEAD',
        'wheat': '#F5DEB3', 'cornsilk': '#FFF8DC',
        // Grays
        'black': '#000000', 'gray': '#808080', 'grey': '#808080', 'dimgray': '#696969',
        'dimgrey': '#696969', 'lightgray': '#D3D3D3', 'lightgrey': '#D3D3D3', 'darkgray': '#A9A9A9',
        'darkgrey': '#A9A9A9', 'silver': '#C0C0C0', 'gainsboro': '#DCDCDC', 'slategray': '#708090',
        'slategrey': '#708090', 'lightslategray': '#778899', 'lightslategrey': '#778899',
        'darkslategray': '#2F4F4F', 'darkslategrey': '#2F4F4F'
    };

    // Color category mapping
    const COLOR_CATEGORIES = {
        red: ['red', 'darkred', 'indianred', 'lightcoral', 'salmon', 'darksalmon', 'lightsalmon', 'crimson', 'firebrick', 'maroon'],
        orange: ['orange', 'darkorange', 'coral', 'tomato', 'orangered'],
        yellow: ['yellow', 'gold', 'lightyellow', 'lemonchiffon', 'lightgoldenrodyellow', 'papayawhip', 'moccasin', 'peachpuff', 'palegoldenrod', 'khaki', 'darkkhaki'],
        green: ['green', 'lime', 'limegreen', 'lightgreen', 'palegreen', 'darkgreen', 'forestgreen', 'seagreen', 'mediumseagreen', 'springgreen', 'mediumspringgreen', 'mediumaquamarine', 'yellowgreen', 'lawngreen', 'chartreuse', 'greenyellow', 'olive', 'olivedrab', 'darkolivegreen', 'teal', 'darkcyan'],
        blue: ['blue', 'navy', 'darkblue', 'mediumblue', 'royalblue', 'steelblue', 'dodgerblue', 'deepskyblue', 'cornflowerblue', 'skyblue', 'lightskyblue', 'lightsteelblue', 'lightblue', 'powderblue', 'cadetblue', 'darkturquoise', 'mediumturquoise', 'turquoise', 'cyan', 'aqua', 'lightcyan', 'paleturquoise', 'aquamarine', 'midnightblue'],
        purple: ['purple', 'indigo', 'darkviolet', 'darkorchid', 'darkmagenta', 'blueviolet', 'mediumpurple', 'mediumorchid', 'orchid', 'violet', 'plum', 'thistle', 'lavender', 'rebeccapurple', 'slateblue', 'darkslateblue', 'mediumslateblue', 'magenta', 'fuchsia'],
        pink: ['pink', 'lightpink', 'hotpink', 'deeppink', 'mediumvioletred', 'palevioletred'],
        brown: ['brown', 'saddlebrown', 'sienna', 'chocolate', 'peru', 'sandybrown', 'burlywood', 'tan', 'rosybrown', 'goldenrod', 'darkgoldenrod'],
        gray: ['black', 'gray', 'grey', 'dimgray', 'dimgrey', 'lightgray', 'lightgrey', 'darkgray', 'darkgrey', 'silver', 'gainsboro', 'slategray', 'slategrey', 'lightslategray', 'lightslategrey', 'darkslategray', 'darkslategrey', 'white', 'snow', 'honeydew', 'mintcream', 'azure', 'aliceblue', 'ghostwhite', 'whitesmoke', 'seashell', 'beige', 'oldlace', 'floralwhite', 'ivory', 'antiquewhite', 'linen', 'lavenderblush', 'mistyrose', 'blanchedalmond', 'bisque', 'navajowhite', 'wheat', 'cornsilk']
    };

    // ============================================
    // COLOR CONVERSION FUNCTIONS
    // ============================================

    // Parse any color input to RGB
    function parseColor(input) {
        if (!input || typeof input !== 'string') return null;
        input = input.trim().toLowerCase();

        // Check named colors
        if (NAMED_COLORS[input]) {
            return hexToRgb(NAMED_COLORS[input]);
        }

        // HEX format
        const hexMatch = input.match(/^#?([a-f0-9]{3,8})$/i);
        if (hexMatch) {
            return hexToRgb('#' + hexMatch[1]);
        }

        // RGB/RGBA format
        const rgbMatch = input.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
                a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
            };
        }

        // RGB percentage format
        const rgbPercentMatch = input.match(/rgb\s*\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
        if (rgbPercentMatch) {
            return {
                r: Math.round(parseFloat(rgbPercentMatch[1]) * 2.55),
                g: Math.round(parseFloat(rgbPercentMatch[2]) * 2.55),
                b: Math.round(parseFloat(rgbPercentMatch[3]) * 2.55),
                a: 1
            };
        }

        // HSL/HSLA format
        const hslMatch = input.match(/hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*([\d.]+))?\s*\)/i);
        if (hslMatch) {
            return hslToRgb(
                parseFloat(hslMatch[1]),
                parseFloat(hslMatch[2]),
                parseFloat(hslMatch[3]),
                hslMatch[4] ? parseFloat(hslMatch[4]) : 1
            );
        }

        // HSV/HSB format
        const hsvMatch = input.match(/hsv\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
        if (hsvMatch) {
            return hsvToRgb(
                parseFloat(hsvMatch[1]),
                parseFloat(hsvMatch[2]),
                parseFloat(hsvMatch[3])
            );
        }

        // CMYK format
        const cmykMatch = input.match(/cmyk\s*\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
        if (cmykMatch) {
            return cmykToRgb(
                parseFloat(cmykMatch[1]),
                parseFloat(cmykMatch[2]),
                parseFloat(cmykMatch[3]),
                parseFloat(cmykMatch[4])
            );
        }

        return null;
    }

    // HEX to RGB
    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');

        // 3-digit hex
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        // 4-digit hex (with alpha)
        if (hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }

        // 8-digit hex (with alpha)
        let a = 1;
        if (hex.length === 8) {
            a = parseInt(hex.slice(6, 8), 16) / 255;
            hex = hex.slice(0, 6);
        }

        const num = parseInt(hex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255,
            a: a
        };
    }

    // RGB to HEX
    function rgbToHex(r, g, b, a = 1) {
        const toHex = (n) => {
            const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        let hex = '#' + toHex(r) + toHex(g) + toHex(b);
        if (a < 1) {
            hex += toHex(Math.round(a * 255));
        }
        return hex.toUpperCase();
    }

    // RGB to HSL
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    // HSL to RGB
    function hslToRgb(h, s, l, a = 1) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a };
    }

    // RGB to HSV
    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h: h * 360, s: s * 100, v: v * 100 };
    }

    // HSV to RGB
    function hsvToRgb(h, s, v) {
        h /= 360; s /= 100; v /= 100;
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a: 1 };
    }

    // RGB to CMYK
    function rgbToCmyk(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const k = 1 - Math.max(r, g, b);
        if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
        const c = (1 - r - k) / (1 - k);
        const m = (1 - g - k) / (1 - k);
        const y = (1 - b - k) / (1 - k);
        return { c: c * 100, m: m * 100, y: y * 100, k: k * 100 };
    }

    // CMYK to RGB
    function cmykToRgb(c, m, y, k) {
        c /= 100; m /= 100; y /= 100; k /= 100;
        const r = 255 * (1 - c) * (1 - k);
        const g = 255 * (1 - m) * (1 - k);
        const b = 255 * (1 - y) * (1 - k);
        return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: 1 };
    }

    // RGB to XYZ (D65 illuminant)
    function rgbToXyz(r, g, b) {
        r /= 255; g /= 255; b /= 255;

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        r *= 100; g *= 100; b *= 100;

        return {
            x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
            y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
            z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041
        };
    }

    // XYZ to RGB
    function xyzToRgb(x, y, z) {
        x /= 100; y /= 100; z /= 100;

        let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
        let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
        let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
        b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

        return {
            r: Math.round(Math.max(0, Math.min(255, r * 255))),
            g: Math.round(Math.max(0, Math.min(255, g * 255))),
            b: Math.round(Math.max(0, Math.min(255, b * 255))),
            a: 1
        };
    }

    // XYZ to LAB
    function xyzToLab(x, y, z) {
        const xn = 95.047, yn = 100.000, zn = 108.883;

        x /= xn; y /= yn; z /= zn;

        const f = (t) => t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + (16 / 116);

        return {
            l: (116 * f(y)) - 16,
            a: 500 * (f(x) - f(y)),
            b: 200 * (f(y) - f(z))
        };
    }

    // LAB to XYZ
    function labToXyz(l, a, b) {
        const xn = 95.047, yn = 100.000, zn = 108.883;

        let y = (l + 16) / 116;
        let x = a / 500 + y;
        let z = y - b / 200;

        const f = (t) => {
            const t3 = Math.pow(t, 3);
            return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
        };

        return {
            x: f(x) * xn,
            y: f(y) * yn,
            z: f(z) * zn
        };
    }

    // RGB to LAB
    function rgbToLab(r, g, b) {
        const xyz = rgbToXyz(r, g, b);
        return xyzToLab(xyz.x, xyz.y, xyz.z);
    }

    // LAB to RGB
    function labToRgb(l, a, b) {
        const xyz = labToXyz(l, a, b);
        return xyzToRgb(xyz.x, xyz.y, xyz.z);
    }

    // LAB to LCH
    function labToLch(l, a, b) {
        const c = Math.sqrt(a * a + b * b);
        let h = Math.atan2(b, a) * (180 / Math.PI);
        if (h < 0) h += 360;
        return { l, c, h };
    }

    // LCH to LAB
    function lchToLab(l, c, h) {
        const hRad = h * (Math.PI / 180);
        return {
            l,
            a: c * Math.cos(hRad),
            b: c * Math.sin(hRad)
        };
    }

    // RGB to LCH
    function rgbToLch(r, g, b) {
        const lab = rgbToLab(r, g, b);
        return labToLch(lab.l, lab.a, lab.b);
    }

    // RGB to HWB
    function rgbToHwb(r, g, b) {
        const hsl = rgbToHsl(r, g, b);
        const w = Math.min(r, g, b) / 255 * 100;
        const bl = (1 - Math.max(r, g, b) / 255) * 100;
        return { h: hsl.h, w, b: bl };
    }

    // HWB to RGB
    function hwbToRgb(h, w, b) {
        w /= 100; b /= 100;
        if (w + b >= 1) {
            const gray = w / (w + b);
            return { r: Math.round(gray * 255), g: Math.round(gray * 255), b: Math.round(gray * 255), a: 1 };
        }
        const rgb = hslToRgb(h, 100, 50);
        for (const key of ['r', 'g', 'b']) {
            rgb[key] = (rgb[key] / 255 * (1 - w - b) + w) * 255;
            rgb[key] = Math.round(rgb[key]);
        }
        return rgb;
    }

    // Calculate relative luminance
    function getLuminance(r, g, b) {
        const sRGB = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    }

    // Calculate contrast ratio
    function getContrastRatio(rgb1, rgb2) {
        const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
        const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    // Check if color is web safe
    function isWebSafe(r, g, b) {
        const webSafeValues = [0, 51, 102, 153, 204, 255];
        return webSafeValues.includes(r) && webSafeValues.includes(g) && webSafeValues.includes(b);
    }

    // Find closest named color
    function findClosestNamedColor(r, g, b) {
        let closest = null;
        let minDist = Infinity;

        for (const [name, hex] of Object.entries(NAMED_COLORS)) {
            const rgb = hexToRgb(hex);
            const dist = Math.sqrt(
                Math.pow(r - rgb.r, 2) +
                Math.pow(g - rgb.g, 2) +
                Math.pow(b - rgb.b, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                closest = name;
            }
        }

        return closest;
    }

    // Get color temperature
    function getColorTemperature(r, g, b) {
        const hsl = rgbToHsl(r, g, b);
        const h = hsl.h;

        if (hsl.s < 10) return 'Neutral';
        if (h >= 0 && h < 60) return 'Warm';
        if (h >= 60 && h < 150) return 'Warm-Neutral';
        if (h >= 150 && h < 210) return 'Cool';
        if (h >= 210 && h < 270) return 'Cool';
        if (h >= 270 && h < 330) return 'Warm-Cool';
        return 'Warm';
    }

    // ============================================
    // COLOR HARMONY FUNCTIONS
    // ============================================

    function getComplementary(h) {
        return [(h + 180) % 360];
    }

    function getAnalogous(h) {
        return [(h + 330) % 360, h, (h + 30) % 360];
    }

    function getTriadic(h) {
        return [h, (h + 120) % 360, (h + 240) % 360];
    }

    function getSplitComplementary(h) {
        return [h, (h + 150) % 360, (h + 210) % 360];
    }

    function getTetradic(h) {
        return [h, (h + 90) % 360, (h + 180) % 360, (h + 270) % 360];
    }

    function getMonochromatic(h, s, l) {
        return [
            { h, s, l: Math.max(10, l - 30) },
            { h, s, l: Math.max(10, l - 15) },
            { h, s, l },
            { h, s, l: Math.min(90, l + 15) },
            { h, s, l: Math.min(90, l + 30) }
        ];
    }

    // ============================================
    // FORMAT OUTPUT FUNCTIONS
    // ============================================

    function getAllFormats(rgb) {
        const { r, g, b, a = 1 } = rgb;
        const hex = rgbToHex(r, g, b, a);
        const hsl = rgbToHsl(r, g, b);
        const hsv = rgbToHsv(r, g, b);
        const cmyk = rgbToCmyk(r, g, b);
        const xyz = rgbToXyz(r, g, b);
        const lab = rgbToLab(r, g, b);
        const lch = rgbToLch(r, g, b);
        const hwb = rgbToHwb(r, g, b);

        // Find named color
        const namedColor = findClosestNamedColor(r, g, b);
        const exactNamed = Object.entries(NAMED_COLORS).find(([, v]) => {
            const vRgb = hexToRgb(v);
            return vRgb.r === r && vRgb.g === g && vRgb.b === b;
        });

        return {
            // Common formats
            common: {
                'HEX': hex,
                'HEX (lowercase)': hex.toLowerCase(),
                'Short HEX': hex.length === 7 && hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]
                    ? '#' + hex[1] + hex[3] + hex[5]
                    : hex,
                'RGB': `rgb(${r}, ${g}, ${b})`,
                'RGB (no spaces)': `rgb(${r},${g},${b})`,
                'RGBA': `rgba(${r}, ${g}, ${b}, ${a})`,
                'HSL': `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,
                'HSLA': `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%, ${a})`,
                'HSV/HSB': `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`,
                'HWB': `hwb(${Math.round(hwb.h)} ${Math.round(hwb.w)}% ${Math.round(hwb.b)}%)`,
                'Named': exactNamed ? exactNamed[0] : `≈ ${namedColor}`,
            },

            // CSS formats
            css: {
                'CSS HEX': hex,
                'CSS RGB': `rgb(${r} ${g} ${b})`,
                'CSS RGB (legacy)': `rgb(${r}, ${g}, ${b})`,
                'CSS RGBA': `rgba(${r} ${g} ${b} / ${a})`,
                'CSS HSL': `hsl(${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%)`,
                'CSS HSL (legacy)': `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,
                'CSS HSLA': `hsla(${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}% / ${a})`,
                'CSS HWB': `hwb(${Math.round(hwb.h)} ${Math.round(hwb.w)}% ${Math.round(hwb.b)}%)`,
                'CSS LAB': `lab(${lab.l.toFixed(1)}% ${lab.a.toFixed(1)} ${lab.b.toFixed(1)})`,
                'CSS LCH': `lch(${lch.l.toFixed(1)}% ${lch.c.toFixed(1)} ${lch.h.toFixed(1)})`,
                'CSS color()': `color(srgb ${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)})`,
                'CSS Variable': `--color: ${hex};`,
            },

            // Print formats
            print: {
                'CMYK': `cmyk(${Math.round(cmyk.c)}%, ${Math.round(cmyk.m)}%, ${Math.round(cmyk.y)}%, ${Math.round(cmyk.k)}%)`,
                'CMYK (0-100)': `${Math.round(cmyk.c)}, ${Math.round(cmyk.m)}, ${Math.round(cmyk.y)}, ${Math.round(cmyk.k)}`,
                'CMYK (0-1)': `${(cmyk.c / 100).toFixed(2)}, ${(cmyk.m / 100).toFixed(2)}, ${(cmyk.y / 100).toFixed(2)}, ${(cmyk.k / 100).toFixed(2)}`,
                'Pantone': `≈ Custom Mix`, // Would need Pantone database
                'RGB (0-1)': `${(r / 255).toFixed(3)}, ${(g / 255).toFixed(3)}, ${(b / 255).toFixed(3)}`,
                'RGB (%)': `${Math.round(r / 255 * 100)}%, ${Math.round(g / 255 * 100)}%, ${Math.round(b / 255 * 100)}%`,
            },

            // Scientific formats
            science: {
                'CIE XYZ': `X: ${xyz.x.toFixed(2)}, Y: ${xyz.y.toFixed(2)}, Z: ${xyz.z.toFixed(2)}`,
                'CIE LAB': `L: ${lab.l.toFixed(2)}, a: ${lab.a.toFixed(2)}, b: ${lab.b.toFixed(2)}`,
                'CIE LCH': `L: ${lch.l.toFixed(2)}, C: ${lch.c.toFixed(2)}, H: ${lch.h.toFixed(2)}°`,
                'Luminance': getLuminance(r, g, b).toFixed(4),
                'sRGB Linear': `${Math.pow(r / 255, 2.2).toFixed(4)}, ${Math.pow(g / 255, 2.2).toFixed(4)}, ${Math.pow(b / 255, 2.2).toFixed(4)}`,
                'Rec. 709': `Y: ${(0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(2)}`,
                'YUV': (() => {
                    const y = 0.299 * r + 0.587 * g + 0.114 * b;
                    const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
                    const v = 0.615 * r - 0.51499 * g - 0.10001 * b;
                    return `Y: ${y.toFixed(1)}, U: ${u.toFixed(1)}, V: ${v.toFixed(1)}`;
                })(),
                'YCbCr': (() => {
                    const y = 16 + 65.481 * r / 255 + 128.553 * g / 255 + 24.966 * b / 255;
                    const cb = 128 - 37.797 * r / 255 - 74.203 * g / 255 + 112 * b / 255;
                    const cr = 128 + 112 * r / 255 - 93.786 * g / 255 - 18.214 * b / 255;
                    return `Y: ${y.toFixed(1)}, Cb: ${cb.toFixed(1)}, Cr: ${cr.toFixed(1)}`;
                })(),
                'YIQ': (() => {
                    const y = 0.299 * r + 0.587 * g + 0.114 * b;
                    const i = 0.596 * r - 0.274 * g - 0.322 * b;
                    const q = 0.211 * r - 0.523 * g + 0.312 * b;
                    return `Y: ${y.toFixed(1)}, I: ${i.toFixed(1)}, Q: ${q.toFixed(1)}`;
                })(),
            },

            // Code formats
            code: {
                'JavaScript HEX': `const color = "${hex}";`,
                'JavaScript RGB': `const color = { r: ${r}, g: ${g}, b: ${b} };`,
                'JavaScript Array': `const color = [${r}, ${g}, ${b}];`,
                'CSS-in-JS': `color: "${hex}"`,
                'Java AWT': `new Color(${r}, ${g}, ${b})`,
                'Java Android': `Color.rgb(${r}, ${g}, ${b})`,
                'Android XML': `#${hex.slice(1)}`,
                'Swift UIColor': `UIColor(red: ${(r / 255).toFixed(3)}, green: ${(g / 255).toFixed(3)}, blue: ${(b / 255).toFixed(3)}, alpha: 1.0)`,
                'Swift Color': `Color(red: ${(r / 255).toFixed(3)}, green: ${(g / 255).toFixed(3)}, blue: ${(b / 255).toFixed(3)})`,
                'Kotlin': `Color(${r}, ${g}, ${b})`,
                'C# Unity': `new Color(${(r / 255).toFixed(3)}f, ${(g / 255).toFixed(3)}f, ${(b / 255).toFixed(3)}f)`,
                'C# WPF': `Color.FromRgb(${r}, ${g}, ${b})`,
                'Python Tuple': `(${r}, ${g}, ${b})`,
                'Python Dict': `{"r": ${r}, "g": ${g}, "b": ${b}}`,
                'Objective-C': `[UIColor colorWithRed:${(r / 255).toFixed(3)} green:${(g / 255).toFixed(3)} blue:${(b / 255).toFixed(3)} alpha:1.0]`,
                'Flutter': `Color(0xFF${hex.slice(1)})`,
                'Qt C++': `QColor(${r}, ${g}, ${b})`,
                'OpenGL': `glColor3f(${(r / 255).toFixed(3)}f, ${(g / 255).toFixed(3)}f, ${(b / 255).toFixed(3)}f);`,
            },

            // Special formats
            special: {
                'Integer': ((r << 16) | (g << 8) | b).toString(),
                'Integer Hex': '0x' + hex.slice(1),
                'Binary R': r.toString(2).padStart(8, '0'),
                'Binary G': g.toString(2).padStart(8, '0'),
                'Binary B': b.toString(2).padStart(8, '0'),
                'Octal': `${r.toString(8)}, ${g.toString(8)}, ${b.toString(8)}`,
                'Filter CSS': `brightness(0) saturate(100%) invert(${Math.round((1 - getLuminance(r, g, b)) * 100)}%)`,
                'Data URI': `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect fill="${hex}"/></svg>`,
                'Web Safe': isWebSafe(r, g, b) ? '✓ Yes' : '✗ No',
                'Grayscale': (() => {
                    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                    return `rgb(${gray}, ${gray}, ${gray})`;
                })(),
                'Inverted': rgbToHex(255 - r, 255 - g, 255 - b),
                'Complementary': (() => {
                    const hsl = rgbToHsl(r, g, b);
                    const comp = hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l);
                    return rgbToHex(comp.r, comp.g, comp.b);
                })(),
            }
        };
    }

    // ============================================
    // UI FUNCTIONS
    // ============================================

    let currentColor = { r: 99, g: 102, b: 241, a: 1 };
    let currentHarmony = 'complementary';

    function updateUI() {
        const { r, g, b, a } = currentColor;
        const hex = rgbToHex(r, g, b, a);
        const hsl = rgbToHsl(r, g, b);

        // Update color preview
        document.getElementById('color-preview').style.backgroundColor = hex;
        document.getElementById('color-picker-display').style.backgroundColor = hex;
        document.getElementById('native-color-picker').value = hex.slice(0, 7);

        // Update contrast previews
        document.getElementById('contrast-white').style.backgroundColor = hex;
        document.getElementById('contrast-black').style.backgroundColor = hex;

        // Update WCAG badges
        updateWCAGBadges();

        // Update luminance
        document.getElementById('luminance-value').textContent = getLuminance(r, g, b).toFixed(3);

        // Update color info
        updateColorInfo();

        // Update all format tabs
        updateFormats();

        // Update harmonies
        updateHarmonies();

        // Update shades and tints
        updateShadesAndTints();

        // Update gradients
        updateGradients();
    }

    function updateWCAGBadges() {
        const { r, g, b } = currentColor;
        const white = { r: 255, g: 255, b: 255 };
        const black = { r: 0, g: 0, b: 0 };

        const contrastWhite = getContrastRatio(currentColor, white);
        const contrastBlack = getContrastRatio(currentColor, black);

        const createBadges = (ratio, containerId) => {
            const container = document.getElementById(containerId);
            const badges = [];

            // AA Normal (4.5:1)
            badges.push(`<span class="accessibility-badge ${ratio >= 4.5 ? 'pass' : 'fail'}">
        ${ratio >= 4.5 ? '✓' : '✗'} AA ${ratio.toFixed(2)}:1
      </span>`);

            // AA Large (3:1)
            badges.push(`<span class="accessibility-badge ${ratio >= 3 ? 'pass' : 'fail'}">
        ${ratio >= 3 ? '✓' : '✗'} AA Large
      </span>`);

            // AAA Normal (7:1)
            badges.push(`<span class="accessibility-badge ${ratio >= 7 ? 'pass' : 'fail'}">
        ${ratio >= 7 ? '✓' : '✗'} AAA
      </span>`);

            container.innerHTML = badges.join('');
        };

        createBadges(contrastWhite, 'wcag-white-badges');
        createBadges(contrastBlack, 'wcag-black-badges');
    }

    function updateColorInfo() {
        const { r, g, b } = currentColor;
        const hsl = rgbToHsl(r, g, b);
        const hsv = rgbToHsv(r, g, b);

        document.getElementById('info-temperature').textContent = getColorTemperature(r, g, b);
        document.getElementById('info-brightness').textContent = Math.round(hsv.v) + '%';
        document.getElementById('info-saturation').textContent = Math.round(hsl.s) + '%';
        document.getElementById('info-hue').textContent = Math.round(hsl.h) + '°';
        document.getElementById('info-named').textContent = findClosestNamedColor(r, g, b);
        document.getElementById('info-websafe').textContent = isWebSafe(r, g, b) ? '✓ Yes' : '✗ No';
    }

    function updateFormats() {
        const formats = getAllFormats(currentColor);

        const createFormatCards = (formatObj, containerId) => {
            const container = document.getElementById(containerId);
            container.innerHTML = Object.entries(formatObj).map(([label, value]) => `
        <div class="format-card" data-copy-value="${value.replace(/"/g, '&quot;')}">
          <div class="format-label">${label}</div>
          <div class="format-value">${value}</div>
        </div>
      `).join('');
        };

        createFormatCards(formats.common, 'common-formats');
        createFormatCards(formats.css, 'css-formats');
        createFormatCards(formats.print, 'print-formats');
        createFormatCards(formats.science, 'science-formats');
        createFormatCards(formats.code, 'code-formats');
        createFormatCards(formats.special, 'special-formats');
    }

    function updateHarmonies() {
        const { r, g, b } = currentColor;
        const hsl = rgbToHsl(r, g, b);

        let hues;
        let colors = [];

        switch (currentHarmony) {
            case 'complementary':
                hues = [hsl.h, ...getComplementary(hsl.h)];
                colors = hues.map(h => hslToRgb(h, hsl.s, hsl.l));
                break;
            case 'analogous':
                hues = getAnalogous(hsl.h);
                colors = hues.map(h => hslToRgb(h, hsl.s, hsl.l));
                break;
            case 'triadic':
                hues = getTriadic(hsl.h);
                colors = hues.map(h => hslToRgb(h, hsl.s, hsl.l));
                break;
            case 'split':
                hues = getSplitComplementary(hsl.h);
                colors = hues.map(h => hslToRgb(h, hsl.s, hsl.l));
                break;
            case 'tetradic':
                hues = getTetradic(hsl.h);
                colors = hues.map(h => hslToRgb(h, hsl.s, hsl.l));
                break;
            case 'monochromatic':
                colors = getMonochromatic(hsl.h, hsl.s, hsl.l).map(c => hslToRgb(c.h, c.s, c.l));
                break;
        }

        const container = document.getElementById('harmony-swatches');
        container.innerHTML = colors.map(c => {
            const hex = rgbToHex(c.r, c.g, c.b);
            return `<div class="harmony-swatch" style="background: ${hex}" data-hex="${hex}" title="${hex}"></div>`;
        }).join('');
    }

    function updateShadesAndTints() {
        const { r, g, b } = currentColor;
        const hsl = rgbToHsl(r, g, b);

        // Tints (add white)
        const tints = [];
        for (let i = 0; i < 10; i++) {
            const newL = hsl.l + (100 - hsl.l) * (i / 10);
            const rgb = hslToRgb(hsl.h, hsl.s, newL);
            tints.push(rgbToHex(rgb.r, rgb.g, rgb.b));
        }

        // Shades (add black)
        const shades = [];
        for (let i = 0; i < 10; i++) {
            const newL = hsl.l * (1 - i / 10);
            const rgb = hslToRgb(hsl.h, hsl.s, newL);
            shades.push(rgbToHex(rgb.r, rgb.g, rgb.b));
        }

        document.getElementById('tints-row').innerHTML = tints.map(hex =>
            `<div class="harmony-swatch" style="background: ${hex}" data-hex="${hex}" title="${hex}"></div>`
        ).join('');

        document.getElementById('shades-row').innerHTML = shades.map(hex =>
            `<div class="harmony-swatch" style="background: ${hex}" data-hex="${hex}" title="${hex}"></div>`
        ).join('');
    }

    function updateGradients() {
        const { r, g, b } = currentColor;
        const hex = rgbToHex(r, g, b);
        const hsl = rgbToHsl(r, g, b);
        const compRgb = hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l);
        const compHex = rgbToHex(compRgb.r, compRgb.g, compRgb.b);

        document.getElementById('gradient-to-white').style.background = `linear-gradient(90deg, ${hex}, #FFFFFF)`;
        document.getElementById('gradient-to-black').style.background = `linear-gradient(90deg, ${hex}, #000000)`;
        document.getElementById('gradient-to-complement').style.background = `linear-gradient(90deg, ${hex}, ${compHex})`;
    }

    function showToast(message) {
        const toast = document.getElementById('copy-toast');
        document.getElementById('toast-message').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Copied: ${text.length > 30 ? text.slice(0, 30) + '...' : text}`);
        });
    }

    function populateNamedColors(filter = 'all') {
        const container = document.getElementById('named-colors');
        let colors = Object.entries(NAMED_COLORS);

        if (filter !== 'all' && COLOR_CATEGORIES[filter]) {
            colors = colors.filter(([name]) => COLOR_CATEGORIES[filter].includes(name));
        }

        container.innerHTML = colors.map(([name, hex]) => `
      <div class="named-color-chip" data-color="${hex}">
        <div class="swatch" style="background: ${hex}"></div>
        <div class="name">${name}</div>
      </div>
    `).join('');
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    function init() {
        // Color input handler
        const colorInput = document.getElementById('color-input');
        let debounceTimer;

        colorInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const parsed = parseColor(e.target.value);
                if (parsed) {
                    currentColor = parsed;
                    updateUI();
                }
            }, 150);
        });

        // Native color picker
        document.getElementById('native-color-picker').addEventListener('input', (e) => {
            const parsed = hexToRgb(e.target.value);
            if (parsed) {
                currentColor = parsed;
                colorInput.value = e.target.value;
                updateUI();
            }
        });

        // Quick actions
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (window.umami) window.umami.track('Color Converter: Action', { action: action });

                const { r, g, b } = currentColor;
                const hsl = rgbToHsl(r, g, b);

                switch (action) {
                    case 'random':
                        currentColor = {
                            r: Math.floor(Math.random() * 256),
                            g: Math.floor(Math.random() * 256),
                            b: Math.floor(Math.random() * 256),
                            a: 1
                        };
                        break;
                    case 'invert':
                        currentColor = { r: 255 - r, g: 255 - g, b: 255 - b, a: 1 };
                        break;
                    case 'lighten':
                        currentColor = hslToRgb(hsl.h, hsl.s, Math.min(100, hsl.l + 10));
                        break;
                    case 'darken':
                        currentColor = hslToRgb(hsl.h, hsl.s, Math.max(0, hsl.l - 10));
                        break;
                    case 'saturate':
                        currentColor = hslToRgb(hsl.h, Math.min(100, hsl.s + 10), hsl.l);
                        break;
                    case 'desaturate':
                        currentColor = hslToRgb(hsl.h, Math.max(0, hsl.s - 10), hsl.l);
                        break;
                }

                colorInput.value = rgbToHex(currentColor.r, currentColor.g, currentColor.b);
                updateUI();
            });
        });

        // Harmony tabs
        document.querySelectorAll('[data-harmony]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-harmony]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentHarmony = btn.dataset.harmony;
                if (window.umami) window.umami.track('Color Converter: Harmony Tab', { tab: currentHarmony });
                updateHarmonies();
            });
        });

        // Format tabs
        document.querySelectorAll('[data-format-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-format-tab]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.formatTab;
                if (window.umami) window.umami.track('Color Converter: Format Tab', { tab: tab });
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`formats-${tab}`).classList.add('active');
            });
        });

        // Copy on click - format cards
        document.addEventListener('click', (e) => {
            const formatCard = e.target.closest('.format-card');
            if (formatCard) {
                const value = formatCard.dataset.copyValue;
                const label = formatCard.querySelector('.format-label')?.textContent;
                if (window.umami) window.umami.track('Color Converter: Copy', { format: label });
                copyToClipboard(value);
                formatCard.classList.add('copied');
                setTimeout(() => formatCard.classList.remove('copied'), 500);
            }

            // Harmony swatches
            const swatch = e.target.closest('.harmony-swatch');
            if (swatch) {
                const hex = swatch.dataset.hex;
                if (window.umami) window.umami.track('Color Converter: Copy Swatch');
                copyToClipboard(hex);
                swatch.classList.add('copied');
                setTimeout(() => swatch.classList.remove('copied'), 500);
            }

            // Named colors
            const namedChip = e.target.closest('.named-color-chip');
            if (namedChip) {
                const color = namedChip.dataset.color;
                const parsed = hexToRgb(color);
                if (parsed) {
                    if (window.umami) window.umami.track('Color Converter: Select Named');
                    currentColor = parsed;
                    colorInput.value = color;
                    updateUI();
                }
            }
        });

        // Color category filters
        document.querySelectorAll('[data-color-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.umami) window.umami.track('Color Converter: Filter', { filter: btn.dataset.colorFilter });
                populateNamedColors(btn.dataset.colorFilter);
            });
        });

        // Initial setup
        populateNamedColors();
        updateUI();
        colorInput.value = '#6366F1';
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
