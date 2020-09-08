import os
import shutil

dest = ".\\.temp"
folders = [".git",".temp"]
endings = (".gitignore",".py",".bat",".code-workspace",".wbn",".aux",".log",".out",".gz")

print(".temp contents:")
for root, dirs, files in os.walk(".\\.temp"):
	for d in dirs:
		shutil.rmtree(os.path.join(root,d))
	for f in files:
		os.remove(os.path.join(root,f))

print("files to copy:")
for root, dirs, files in os.walk("."):
	destDir = os.path.join(dest,root)
	print("Found directory: "+root+" --> "+destDir)
	if not os.path.exists(destDir):
		os.makedirs(destDir)
		print("Created directory!")
	dirs[:] = [dir for dir in dirs if not dir in folders]
	for i, dir in enumerate(dirs):
		print("\tsubdir "+str(i)+": "+dir)
	for f in files:
		if not f.endswith(endings):
			filePath = os.path.join(root,f)
			destPath = os.path.join(dest,root,f)
			print("\t"+filePath+" --> "+destPath)
			shutil.copyfile(filePath,destPath)

#os.system('webbundle create --base-url "https://peabrainiac.github.io/" --primary-url "https://peabrainiac.github.io/index.html" bundle.wbn .temp')
os.system('gen-bundle -dir .temp -baseURL "https://peabrainiac.github.io/mandelbrotJS/" -primaryURL "https://peabrainiac.github.io/mandelbrotJS/" -o bundle.wbn')