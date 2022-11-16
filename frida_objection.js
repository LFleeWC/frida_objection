setImmediate(function() {
    console.log("[*] Starting script");

    Java.perform(function() {

    startWatchClass();
    startWatchMethod();

    });

})
var gcontext;
var gclassloader;

//dump so
function dumpso(soname){
    var libso = Process.findModuleByName(soname);
    console.log(libso);
    console.log(libso.base);
    console.log(libso.size);
    Memory.protect(ptr(libso.base), libso.size, 'rwx');
    //return libso_buffer;
    var file = new File("/data/data/a.b.c/cache/"+soname,"a+");
    if (file && file != null) {
      var libso_buffer = ptr(libso.base).readByteArray(libso.size);
      file.write(libso_buffer);
      file.flush();
      file.close();
      console.log("base: "+libso.base);
      console.log("size: "+libso.size);
    
      fixso("/data/data/a.b.c/cache/libcrackme.dump.so",libso.base,libso.size);
  }

}

//提前将SoFixer64 pull到/data/local/tmp中
function fixso(sopath,base,size){
    execstr("/data/local/tmp/SoFixer64 -m "+base+" -s "+sopath+" -o "+sopath+".fix.so");

}

//执行命令
function execstr(str) {
    var String = Java.use('java.lang.String');
    var BufferedReader = Java.use('java.io.BufferedReader');
    var InputStreamReader = Java.use('java.io.InputStreamReader');
    var StringBuilder = Java.use('java.lang.StringBuilder');
    var process = Java.use("java.lang.Runtime").getRuntime().exec("sh");
    var DataOutputStream = Java.use("java.io.DataOutputStream");
    var os = DataOutputStream.$new(process.getOutputStream());
    os.writeBytes(String.$new(str));
    os.writeBytes(String.$new("\n"));
    os.flush();
    os.writeBytes("exit\n");
    os.flush();
    process.waitFor();

    var bufferedReader = BufferedReader.$new(InputStreamReader.$new(process.getInputStream()));
    var errorbufferedReader = BufferedReader.$new(InputStreamReader.$new(process.getErrorStream()));

    var stringbuilder = StringBuilder.$new();
    var errorstringbuilder = StringBuilder.$new();
    var tmp;
    while ((tmp = bufferedReader.readLine()) != null) {
        stringbuilder.append(tmp);
    }
    while ((tmp = errorbufferedReader.readLine()) != null) {
        errorstringbuilder.append(tmp);
    }

    os.close();
    bufferedReader.close();
    errorbufferedReader.close();
    process.destroy();

    var result = stringbuilder.toString();
    var errorresult = errorstringbuilder.toString();

    console.log(result);
    console.log(errorresult);

    if ((errorresult+"") != "") {
        return errorresult;
    }
    return result;
}

var Activity;

function printdex() {
    Java.enumerateClassLoaders({
        onMatch(loader) {
            console.log("====> " + loader.toString());
        },
        onComplete() {}
    });
}

function printAllclass() {

    Java.enumerateClassLoaders({
        onMatch(loader) {
            Java.classFactory.loader = loader;
            Java.enumerateLoadedClasses({
                onMatch(name, handle) {
                    console.log(name);
                },
                onComplete() {}
            })

        },
        onComplete() {
            console.log("===完成===");
        }
    })
}
//打印堆栈
function PTrace() {
    console.log(Java.use("android.util.Log").getStackTraceString(Java.use("java.lang.Throwable").$new()));
}
function ScanObject(activiyname, callbak) {
    let object = null;
    Java.choose(activiyname, {
        onMatch: function(obj) {
            object = obj;
            return 'stop';
        },
        onComplete: function() {
            callbak(object);

        }
    });


}


var classArray = ['android.app.Application']; //监听类 

var methodArray = []; //监听方法 'android.app.Application.attachBaseContext','android.app.Application.$init'

//watch 类
function startWatchClass() {

    Java.openClassFile("/data/local/tmp/r0gson.dex").load();

    var gson = Java.use('com.r0ysue.gson.Gson');

    for (let i = 0; i < classArray.length; i++) {
        let ishook = false;
        //遍历dex中的class
        Java.enumerateClassLoaders({
            onMatch(loader) {
                Java.classFactory.loader = loader;
                if (!ishook) {
                    try {
                        var classname = Java.use(classArray[i])
                        var methods = classname.class.getDeclaredMethods();

                        for (var j = 0; j < methods.length; j++) {
                            var methodName = methods[j].getName();

                            if (methodName == "toString") {
                                continue;
                            }
                            // hook methodNmae 这个类的所有方法（难点在于每个方法的参数是不同的）overloads为数组
                            for (var k = 0; k < classname[methodName].overloads.length; k++) {

                                classname[methodName].overloads[k].implementation = function() {


                                    var curmethod = getcurmethod();

                                    // 这是 hook 逻辑arguments 内部数
                                    var args = new Array;
                                    for (var i = 0; i < arguments.length; i++) {
                                        args.push(arguments[i])
                                    }
                                    console.log("===>开始执行" + this.getClass() + "的" + curmethod + "方法");
                                    var result = this[curmethod].apply(this, arguments); // 重新调用


                                    try {
                                        console.log("==> 调用:" + this.getClass() + "的" + curmethod + "方法,参数为:" + args + "结果为:" + gson.$new().toJson(result));
                                    } catch (e) {
                                        console.log("==> 调用:" + this.getClass() + "的" + curmethod + "方法,参数为:" + args + "结果为:" + result);
                                    }

                                    console.log('===>堆栈为：');
                                    PTrace();
                                    return result;
                                }
                            }

                        }
                        ishook = true;
                        console.log("====hook class====");
                    } catch (e) {
                         console.log(e);
                    }
                }
            },
            onComplete() {
                console.log("onComplete");
            }
        });
    }
}  

//watch 方法
function startWatchMethod() {
    Java.openClassFile("/data/local/tmp/r0gson.dex").load();
    var gson = Java.use('com.r0ysue.gson.Gson');

    for (let i = 0; i < methodArray.length; i++) {
        let ishook = false;
        //遍历dex中的class
        Java.enumerateClassLoaders({
            onMatch(loader) {
                Java.classFactory.loader = loader;
                if (!ishook) {
                    try {
                        var classname = Java.use(methodArray[i].substring(0, methodArray[i].lastIndexOf('.')))
                        var methodName = classname.class.getDeclaredMethods();
                        var method;

                        for (let name = 0; name < methodName.length; name++) {

                            if (methodName[name].getName() == methodArray[i].substring(methodArray[i].lastIndexOf('.') + 1)) {
                                method = methodName[name].getName();
                                break;
                            }
                        }


                        for (var k = 0; k < classname[method].overloads.length; k++) {

                            classname[method].overloads[k].implementation = function() {

                                var curmethod = getcurmethod();

                                // 这是 hook 逻辑arguments 内部数
                                var args = new Array;
                                for (var i = 0; i < arguments.length; i++) {
                                    args.push(arguments[i])
                                }
                                console.log("===>开始执行" + this.getClass() + "的" + curmethod + "方法");
                                var result = this[curmethod].apply(this, arguments); // 重新调用

                                try {
                                    console.log("==> 调用:" + this.getClass() + "的" + curmethod + "方法,参数为:" + args + "结果为:" + gson.$new().toJson(result));
                                } catch (e) {
                                    console.log("==> 调用:" + this.getClass() + "的" + curmethod + "方法,参数为:" + args + "结果为:" + result);
                                }

                                console.log('===>堆栈为：');
                                PTrace();
                                return result;
                            }
                        }
                        console.log("hook");
                        ishook = true;
                    } catch (e) {
                        // console.log(e);
                    }
                }

            },
            onComplete() {
                console.log("onComplete");
            }
        });


    }


}

//获取当前方法
function getcurmethod() {

    var Thread = Java.use("java.lang.Thread");

    var stackTraceElement = Thread.currentThread().getStackTrace();
    // stackTraceElement[0].getMethodName();

    // console.log("===当前方法==="+stackTraceElement[2].getMethodName());

    return stackTraceElement[2].getMethodName();
}

//打印类的方法
function findshowmethod(className) {
    if (Java.available) {
        Java.perform(function() {
            let isfind = false;
            Java.enumerateClassLoaders({
                onMatch: function(loader) {
                    if (!isfind) {
                        try {
                            Java.classFactory.loader = loader;

                            //var loadclass = loader.loadClass(className);
                            var loadclass = Java.use(className);
                            var methods = loadclass.class.getDeclaredMethods();

                            for (var j = 0; j < methods.length; j++) {
                                // var methodName = methods[j].getName();
                                console.log("===> " + methods[j]);
                            }
                            isfind = true;
                        } catch (e) {
                            //console.log("error", e);
                        }
                    }
                },
                onComplete: function() {
                    console.log("find  Classloader instance over");
                }
            });
        });
    }

}
//遍历classloader加载类
function multiclassl(callback) {
    if (Java.available) {
        Java.perform(function() {
            let isfind = false;
            Java.enumerateClassLoaders({
                onMatch: function(loader) {
                    if (!isfind) {
                        try {
                            Java.classFactory.loader = loader;
                            callback;

                            isfind = true;
                        } catch (e) {
                            //console.log("error", e);
                        }
                    }
                },
                onComplete: function() {
                    console.log("find  Classloader instance over");
                }
            })
        })
    }
}
//打印读取file文件
function showfile(fileobj) {
    multiclassl(function() {
        var FileInputStream = Java.use("java.io.FileInputStream");
        //var File = Java.use("java.io.File");
        var Byte = Java.use("[B");
        var String = Java.use("java.lang.String");

        var fileInputStream = FileInputStream.$new(fileobj);
        var byte = Byte.$new(fileInputStream.available())

        fileInputStream.read(byte);
        fileInputStream.close();
        var str = String.$new(byte);
        return str;
    })
}
