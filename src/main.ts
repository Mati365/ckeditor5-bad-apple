import { setupEditor } from "./setup-editor";
import { BadApple } from "./plugin/bad-apple-plugin";

import "./style.css";

setupEditor(document.getElementById("editor")!, {
  plugins: [BadApple],
  badApple: {
    width: 8 * 5,
    height: 6 * 5,
    sampleRate: 50,
    maxLength: Infinity
  },
});
