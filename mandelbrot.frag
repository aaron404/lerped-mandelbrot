#version 450

// simulation consts
#define VIEW_HEIGHT 2.0     // height of unzoomed view
#define SPEED 0.000010          // time multiplier
#define Q 10.0              // quantization factor
#define PI 3.14159265

// background transform constants
#define BG_SCALE 1.0
#define BG_OFFSET vec2(0.0)
#define MARGIN 2.0
#define CUTOFF_RADIUS 4.0

// drawing constants
#define LINE_THICKNESS (0.0035 * VIEW_HEIGHT)
#define DERIVATIVE_MULTIPLIER 250.0

// flags
#define JULIA true
#define ZOOM_ANIM false
#define QUANTIZE true
#define DRAW_GRID true
#define NORMALIZE_LINES true
#define USE_TEXTURE false
#define SHOW_DERIV_MAGNITUDE false
#define SHOW_IMG_ONLY false
#define DEBUG false

// product of two complex numbers
#define product(a, b) vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x)

// quantize a vector
// the translation of a is to prevent equal value bands near the edge of the boundary since the pattern is periodic
// multiplication by 0.9999 avoids some edge cases of == 0.0
#define quantize(a, f) (floor((a + (1.0 / Q) / 2.0) * f * 0.9999) / f)

uniform float time;
uniform vec2 resolution;
uniform vec4 iMouse;
uniform uint draw_julia;
uniform uint draw_derivative;
uniform float line_width;
uniform float fade_width;

vec4 rainbow(vec2 vec) {
    float theta = atan(vec.x, vec.y);
    
    vec3 col = cos(theta + vec3(0.0, 1.0, 2.0) * PI * .5) / 2.0 + 0.5;
    return vec4(col, 1.0);
}

// image to sample
vec4 img(vec2 uv, vec2 dz, float zoom) {
    vec2 xy = abs(mod((uv + BG_OFFSET) * BG_SCALE, MARGIN) - MARGIN / 2.0);
    if (QUANTIZE) {
        xy = quantize(xy, Q);
    }

    vec4 col = vec4(0.0);
    col += vec4(xy, 1.8 - length(xy), 0.0);

    // clean up boundary
    col = smoothstep(CUTOFF_RADIUS + fade_width, CUTOFF_RADIUS, length(uv)) * col;
    
    // add gridlines (scaled by derivative)
    // mdz is 2d derivative of point z with respect to number of iterations
    // contour lines are proportional in width to the derivative, but require a large scale factor
    // after scaling, value is clamped to avoid overly thick lines around outer boundary
    float mdz = 1.0;
    if (NORMALIZE_LINES) {
        mdz = length(dz) * DERIVATIVE_MULTIPLIER;
        mdz = clamp(0.0, 1.0, mdz);
    }

    // computes a triangle wave of frequency 1/Q, uses smoothstep to only darken where function < LINE_THICKNESS
    float period = 1.0 / Q;
    float x = smoothstep(line_width * mdz, (line_width + fade_width) * mdz, Q * abs(mod(uv.x, period) - period * 0.5));
    float y = smoothstep(line_width * mdz, (line_width + fade_width) * mdz, Q * abs(mod(uv.y, period) - period * 0.5));
    
    // if (USE_TEXTURE) {
    //     col = texture(iChannel1, xy);
    // }
    
    if (DRAW_GRID) {
        return col * x * y;
    } else {
        return col;
    }
}

// draw a circle at position p with radius r for fragment uv
float sdf_circle(vec2 uv, vec2 p, float r) {
    return smoothstep(fade_width, fade_width * 2.0, abs(length(uv - p) - r));
}

// debug overlay
void draw_overlay(vec2 uv, inout vec4 fc) {
    fc *= sdf_circle(uv, vec2(0.0), 2.0);
    fc *= sdf_circle(uv, vec2(0.0), 1.0);
}

void main()
{
    //vec2 iResolution = vec2(480, 320);
    float t = time * SPEED + 0.0;
    float aspect = resolution.x / resolution.y;
    float zoom = 1.0;
    if (ZOOM_ANIM) {
        zoom += t * 0.25;
    }
    
    // coordinate to "look at"
    vec2 xy = vec2(-1.050027899403, -0.255482124970);
    
    // Normalized pixel coordinates (from -2 to 2)
    vec2 uv = VIEW_HEIGHT * (gl_FragCoord.xy / resolution.xy - 0.5);
    uv.x *= aspect;

    // length of half a pixel in world space
    vec3 d = vec3(0.5 * vec2(VIEW_HEIGHT / zoom) / resolution.xy, 0.0);
    d.x *= aspect;
    
    uv /= zoom;
    //uv = uv.yx;
    //uv += xy;
    //uv.x -= 0.5;
    
    // compute at 4 close positions (for derivative and anti-aliasing)
    // maintain state from previous iteration for lerping
    vec2[4] c, z, prev;
    vec2 zz = vec2(0.0);
    if (draw_julia) {
        vec2 cc = vec2(0.28, -0.008);
        cc = vec2(-0.79, 0.15);
        c = vec2[4](cc, cc, cc, cc);
        z    = vec2[4](uv, uv + d.xz, uv + d.yz, uv + d.xy);
        prev = vec2[4](zz, zz, zz, zz);
    } else {
        c    = vec2[4](uv, uv + d.xz, uv + d.yz, uv + d.xy);
        z    = vec2[4](zz, zz, zz, zz);
        prev = vec2[4](zz, zz, zz, zz);
    }

    for (int i=0; i<1000; i+= 1) {
        if (i > int(t + 1.0)) {
            break;
        }
        for (int j=0; j<4; j+=1) {
            prev[j] = z[j];
            z[j] = product(z[j], z[j]) + c[j];
        }
    }

    // compute derivative and previous iteration derivative
    vec2 dz = vec2((z[1] - z[0]).x, (z[2] - z[0]).y);
    vec2 dz_prev = vec2((prev[1] - prev[0]).x, (prev[2] - prev[0]).y);

    // lerp factor (an attempt was made to get some smooth motion, could be improved)
    float mix_factor = smoothstep(0.0, 1.0, fract(t));
    mix_factor = smoothstep(0.0, 1.0, pow(fract(t), 2.0));
    mix_factor = fract(t);

    // lerp z and dz
    vec2 z_lerped = mix(prev[0], z[0], mix_factor);
    vec2 dz_lerped = mix(dz_prev, dz, mix_factor);

    if (draw_derivative) {
        if (SHOW_DERIV_MAGNITUDE) {
            gl_FragColor = vec4(length(dz_lerped) * 4000.0);
        } else {
            gl_FragColor = rainbow(dz_lerped); //vec4(dz_lerped * 4000.0, 0.0, 1.0);
        }
        //gl_FragColor = smoothstep(CUTOFF_RADIUS + LINE_THICKNESS, CUTOFF_RADIUS, length(z_lerped)) * gl_FragColor;
        gl_FragColor = (1.0 - smoothstep(CUTOFF_RADIUS, CUTOFF_RADIUS + fade_width * 160.0, length(z_lerped))) * gl_FragColor;
    } else {
        // sample the image
        int i = 0;
        for (i=0; i<4; i+=1) {
            vec2 z_lerped = mix(prev[i], z[i], mix_factor);
            gl_FragColor += img(z_lerped, dz_lerped, zoom);
        }
        gl_FragColor /= float(i);
    }
    
    if (SHOW_IMG_ONLY) {
        gl_FragColor = img(uv, d.xy, zoom);
    }
    
    if (DEBUG) {
        draw_overlay(uv, gl_FragColor);
    }

    //gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}