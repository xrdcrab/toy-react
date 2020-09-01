# toy-react

Prerequisite:
* Install Node.js、npm : https://nodejs.org/en/ 
* webpack： https://webpack.js.org/guides/getting-started/ 
* React Tutorial: https://reactjs.org/tutorial/tutorial.html 
* TicTacToe: https://codepen.io/gaearon/pen/gWWZgR 
* MDN: https://developer.mozilla.org/en-US/

## 基于实 DOM 体系的 toy-react 的 component 的设定

JSX 里小写的tag名字会被认为是原生tag，大写会被认为是class或function

Babel会根据元素名称的大小写使用不同的方式处理JSX。 小写字母名称会以字符串参数的形式进行传递; 首字母大写的名称则会作为函数进行传递，就像在代码段中一样。