.PHONY: check package
# Parse without importing handlers (imports can contact AWS / read environment).
check:
	python3 -c 'import ast,pathlib; files=list(pathlib.Path("lambda").glob("*/main.py")); assert len(files)==9; [(ast.parse(p.read_text()), print(p)) for p in files]'
# Source-only review candidates, NOT production artifacts or vendored dependencies.
package: check
	python3 -c 'import pathlib,zipfile; out=pathlib.Path("build/candidates"); out.mkdir(parents=True,exist_ok=True); [(zipfile.ZipFile(out/(p.parent.name+".zip"),"w").write(p,"main.py")) for p in pathlib.Path("lambda").glob("*/main.py")]'
