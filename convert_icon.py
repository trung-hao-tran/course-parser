from PIL import Image
import cairosvg
import io

def convert_svg_to_ico():
    # Convert SVG to PNG first
    png_data = cairosvg.svg2png(url="static/app.svg")
    
    # Open the PNG data
    img = Image.open(io.BytesIO(png_data))
    
    # Save as ICO
    img.save("static/app.ico")

if __name__ == "__main__":
    convert_svg_to_ico() 