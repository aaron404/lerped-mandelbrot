import time

import OpenGL.GL as gl
import OpenGL.GL.shaders as shaders
import OpenGL.GLU as glu
import OpenGL.GLUT as glut

vert_shader = """
#version 450
layout(location = 0) in vec4 position;
void main() {
    gl_Position = vec4(position.xyz * 2 - 1, 1);
}
"""

frag_shader = open("mandelbrot.frag", "r").read()

class Controller():

    def __init__(self, w, h):
        
        self.w = w
        self.h = h
        self.scale = 1

        # flags
        # TODO: use as macros and recompile shader
        self.draw_julia = False
        self.draw_derivative = False
        self.paused = False
        self.line_width = 0.001
        self.fade_width = 0.001

        self.shader_flags = {
            'JULIA': True
        }
        self.shader = shaders.compileProgram(
            shaders.compileShader(vert_shader, gl.GL_VERTEX_SHADER),
            shaders.compileShader(frag_shader, gl.GL_FRAGMENT_SHADER)
        )

        uniforms = ['resolution',
                    'time',
                    'draw_julia',
                    'draw_derivative',
                    'line_width',
                    'fade_width']
        self.shader_ids = {key: gl.glGetUniformLocation(self.shader, key) for key in uniforms}

        self.frame = 0

        gl.glEnable(gl.GL_MULTISAMPLE)

    def resize(self, w, h):
        if self.scale > 0:
            self.w = w * self.scale
            self.h = h * self.scale
        else:
            s = abs(self.scale) + 1
            self.w = w / s
            self.h = h / s
        gl.glViewport(0, 0, glut.glutGet(glut.GLUT_WINDOW_WIDTH), glut.glutGet(glut.GLUT_WINDOW_HEIGHT))


    def step(self):
        glut.glutPostRedisplay()

    def draw(self):
        
        gl.glUseProgram(self.shader)

        gl.glUniform2f(self.shader_ids['resolution'], self.w, self.h)
        gl.glUniform1f(self.shader_ids['time'], self.frame)
        gl.glUniform1f(self.shader_ids['line_width'], self.line_width)
        gl.glUniform1f(self.shader_ids['fade_width'], self.fade_width)
        gl.glUniform1ui(self.shader_ids['draw_julia'], self.draw_julia)
        gl.glUniform1ui(self.shader_ids['draw_derivative'], self.draw_derivative)
        gl.glBegin(gl.GL_QUADS)
        gl.glVertex2f(0, 0)
        gl.glVertex2f(0, 1)
        gl.glVertex2f(1, 1)
        gl.glVertex2f(1, 0)
        gl.glEnd()

        gl.glFlush()

        if not self.paused:
            self.frame += 1
            if not self.frame % 1000:
                print(self.frame)
    
    def keyboard_cb(self, key, x, y):
        if key == b'q':
            glut.glutLeaveMainLoop()
        elif key == b'f':
            glut.glutFullScreenToggle()
        elif key == b'j':
            self.draw_julia = not self.draw_julia
        elif key == b'd':
            self.draw_derivative = not self.draw_derivative
        elif key == b'p':
            self.paused = not self.paused

    def keyboard_special_cb(self, key, x, y):
        if key == glut.GLUT_KEY_UP:
            self.line_width *= 1.1
            # self.scale += 1
        elif key == glut.GLUT_KEY_DOWN:
            self.line_width /= 1.1
            # self.scale -= 1
        elif key == glut.GLUT_KEY_LEFT:
            self.fade_width /= 1.1
            # self.frame -= 1000
        elif key == glut.GLUT_KEY_RIGHT:
            # self.frame += 1000
            self.fade_width *= 1.1
        pass

def idle_cb():
    controller.step()

def reshape_cb(w, h):
    gl.glViewport(0, 0, glut.glutGet(glut.GLUT_WINDOW_WIDTH), glut.glutGet(glut.GLUT_WINDOW_HEIGHT))
    controller.resize(w, h)

if __name__ == "__main__":
    w, h = (960, 540)

    # Initialize GLUT library
    glut.glutInit()

    # Setup window
    screen_width = glut.glutGet(glut.GLUT_SCREEN_WIDTH)
    screen_height = glut.glutGet(glut.GLUT_SCREEN_HEIGHT)

    glut.glutInitWindowSize(w, h)
    glut.glutInitWindowPosition(0, 0)
    glut.glutInitDisplayMode(glut.GLUT_SINGLE | glut.GLUT_RGB)
    glut.glutCreateWindow(b'glMandelbrot')

    controller = Controller(w, h)

    # Register event callbacks
    glut.glutIdleFunc(idle_cb)
    glut.glutDisplayFunc(controller.draw)
    glut.glutKeyboardFunc(controller.keyboard_cb)
    glut.glutSpecialFunc(controller.keyboard_special_cb)
    glut.glutReshapeFunc(reshape_cb)

    glut.glutMainLoop()