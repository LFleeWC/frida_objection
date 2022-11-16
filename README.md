"# frida_objection" 

使用firda来实现objection一些好用的功能，快速hook，dumpso的功能

<img src="https://github.com/LFleeWC/frida_objection/blob/main/img/1.png" width="700"/>

修改js添加你需要的类或者方法

```
var classArray = ['android.app.Application']; //监听类 
var methodArray = []; //监听方法 'android.app.Application.attachBaseContext','android.app.Application.$init'
```

push r0gson.dex 到/data/local/tmp/ ,dumpso 需要SoFixer64和SoFixer32 到/data/local/tmp/位置
使用frida加载js
```
frida -U -f 包名 -l frida_objection.js --no-pause
```
