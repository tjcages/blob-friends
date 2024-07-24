export const vertexShaderSource = `
    precision highp float;
    varying vec2 vUv;
    attribute vec2 a_position;
    void main () {
        vUv = .5 * (a_position + 1.);
        gl_Position = vec4(a_position, 0., 1.);
    }
`;

export const fragmentSpeedShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D u_prev_frame_texture;
    uniform vec2 u_pointer_position;
    uniform float u_pointer_power;
    uniform vec2 u_delta_xy;
    uniform float u_ratio;
    uniform float u_speed_fade;
    #define TWO_PI 6.28318530718
    #define PI 3.14159265358979323846
    void main () {
        vec2 uv = vUv;
        vec2 pointer = u_pointer_position;
        pointer.x *= u_ratio;
        vec2 pointer_uv = uv;
        pointer_uv.x *= u_ratio;
        float pointer_dot = 1. - clamp(length(pointer_uv - pointer), 0., 1.);
        pointer_dot = pow(pointer_dot, 6.);
        pointer_dot *= u_pointer_power;
        vec3 back = texture2D(u_prev_frame_texture, uv).rgb;
        back *= u_speed_fade;
        back = mix(back, vec3(u_delta_xy, 0.), pointer_dot);
        gl_FragColor = vec4(back.xyz, 1.);
    }
`;

export const fragmentOutputShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D u_speed_texture;
    uniform float u_ratio;
    uniform float u_time;
    uniform float u_pointer_multiplier;

    #define MAX_BLOBS 10
    uniform vec3 u_blob_colors[MAX_BLOBS];
    uniform vec2 u_blob_positions[MAX_BLOBS];
    uniform float u_blob_sizes[MAX_BLOBS];
    uniform int u_blob_count;

    #define TWO_PI 6.28318530718
    #define PI 3.14159265358979323846

    float random(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float get_dot_shape(vec2 dist, float radius) {
        return 1.0 - smoothstep(0.0, radius, dot(dist, dist) * 4.0);
    }

    float get_point_shape(vec2 dist, float p) {
        float v = pow(1.0 - clamp(0.0, 1.0, length(dist)), 1.0);
        v = smoothstep(0.0, 1.0, v);
        v = pow(v, 2.0);
        return v;
    }

    void main() {
        float t = 0.01 * u_time;
        vec2 offset = texture2D(u_speed_texture, vUv).xy;
        offset.x = -offset.x;
        offset *= u_pointer_multiplier;

        float offset_pow = 9.0;
        float offset_mult = 1.9;
        offset.x += offset_mult * pow(vUv.x, offset_pow);
        offset.x -= offset_mult * pow(1.0 - vUv.x, offset_pow);
        offset.y += offset_mult * pow(vUv.y, offset_pow);
        offset.y -= offset_mult * pow(1.0 - vUv.y, offset_pow);

        vec2 uv = vUv - 0.5;
        uv.x *= u_ratio;

        float f[MAX_BLOBS];
        float f_eyes[MAX_BLOBS];
        float f_pupils[MAX_BLOBS];

        for (int i = 0; i < MAX_BLOBS; i++) {
            if (i >= u_blob_count) break;
            
            vec2 f_uv = uv + (1.0 + float(i) * 0.2) * offset;
            vec2 traj = 0.04 * vec2(4.0 * sin(0.15 * t + u_blob_positions[i].x), 0.2 + 9.5 * cos(0.13 * t + u_blob_positions[i].y));
            vec2 eye_size = vec2(0.015, 0.001);
            float eye_x = 0.1;
            float eye_y = 0.1 + 0.1 * traj.y;

            // Apply size to the entire blob
            f[i] = get_point_shape((f_uv + traj - u_blob_positions[i]) / u_blob_sizes[i], 5.0);
            f_eyes[i] = get_dot_shape((f_uv - vec2(eye_x, eye_y) + traj - u_blob_positions[i]) / u_blob_sizes[i], eye_size.x);
            f_eyes[i] += get_dot_shape((f_uv - vec2(-eye_x, eye_y) + traj - u_blob_positions[i]) / u_blob_sizes[i], eye_size.x);
            f_pupils[i] = get_dot_shape((f_uv - vec2(eye_x, eye_y - 0.02) + traj - u_blob_positions[i]) / u_blob_sizes[i], eye_size.y);
            f_pupils[i] += get_dot_shape((f_uv - vec2(-eye_x + 0.005, eye_y - 0.03) + traj - u_blob_positions[i]) / u_blob_sizes[i], eye_size.y);
        }

        // Apply original interactions for the first three blobs
        if (u_blob_count > 2) {
            f[0] -= f[1];
            f[2] -= f[1];
            f[1] -= f[0];
            f[1] -= f[2];
            f[0] -= f[2];
            f[2] -= f[0];
            f[2] -= f[0];
        }

        float opacity = 0.0;
        vec3 color = vec3(0.0);

        for (int i = 0; i < MAX_BLOBS; i++) {
            if (i >= u_blob_count) break;

            f_eyes[i] *= smoothstep(0.1, 0.9, f[i]);
            f_pupils[i] *= smoothstep(0.1, 0.9, f[i]);

            f[i] = step(0.3, f[i]);
            f_eyes[i] = step(0.2, f_eyes[i]);
            f_pupils[i] = step(0.2, f_pupils[i]);

            float blob_opacity = f[i];

            if (i < 3) {
                opacity += (i == 0) ? blob_opacity : (i == 1) ? 0.9 * blob_opacity : 0.95 * blob_opacity;
                opacity *= (1.0 - f_eyes[i]);
                opacity += f_pupils[i];
            } else {
                opacity = mix(opacity, 1.0, blob_opacity);
            }

            vec3 blob_color = f[i] * u_blob_colors[i];
            blob_color = mix(blob_color, vec3(1.0), f_eyes[i]); // White eyes
            blob_color = mix(blob_color, vec3(0.0), f_pupils[i]); // Black pupils

            color = mix(color, blob_color, blob_opacity);
        }

        float noise = random(uv + sin(t));
        color += noise * 0.15;

        gl_FragColor = vec4(color, opacity);
    }
`;
