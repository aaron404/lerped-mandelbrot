
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

        self.shader = shaders.compileProgram(
            shaders.compileShader(vert_shader, gl.GL_VERTEX_SHADER),
            shaders.compileShader(frag_shader, gl.GL_FRAGMENT_SHADER)
        )

        uniforms = ['resolution', 'time']
        self.shader_ids = {key: gl.glGetUniformLocation(self.shader, key) for key in uniforms}

        self.frame = 0

    def resize(self, w, h):
        self.w = w
        self.h = h

    def step(self):
        glut.glutPostRedisplay()

    def draw(self):
        
        gl.glUseProgram(self.shader)

        gl.glUniform2f(self.shader_ids['resolution'], self.w, self.h)
        gl.glUniform1f(self.shader_ids['time'], self.frame)
        gl.glBegin(gl.GL_QUADS)
        gl.glVertex2f(0, 0)
        gl.glVertex2f(0, 1)
        gl.glVertex2f(1, 1)
        gl.glVertex2f(1, 0)
        gl.glEnd()

        gl.glFlush()

        self.frame += 1
        if not self.frame % 1000:
            print(self.frame)

def idle_cb():
    controller.step()

def keyboard_cb(key, x, y):
    if key == b'q':
        exit()
    elif key == b'f':
        glut.glutFullScreenToggle()
    pass

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
    glut.glutCreateWindow(b'glMona')

    controller = Controller(w, h)

    # Register event callbacks
    glut.glutIdleFunc(idle_cb)
    glut.glutDisplayFunc(controller.draw)
    glut.glutKeyboardFunc(keyboard_cb)
    glut.glutReshapeFunc(reshape_cb)

    glut.glutMainLoop()