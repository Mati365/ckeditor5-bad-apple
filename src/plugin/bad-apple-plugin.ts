import { Plugin, ButtonView } from "ckeditor5";
import type { Editor, ModelElement } from "ckeditor5";
import { prerenderBadApple, type PrerenderBadAppleConfig } from "./prerender-bad-apple";

export class BadApple extends Plugin {
  private prerenderPromise: Promise<ArrayBuffer[]>;
  private audio: HTMLAudioElement | null = null;

  static get pluginName() {
    return "BadApple" as const;
  }

  constructor(editor: Editor) {
    super(editor);

    this.prerenderPromise = prerenderBadApple(
      editor.config.get("badApple")!
    );

    // Create audio element
    this.audio = document.createElement("audio");
    this.audio.src = "/bad-apple.mp4"; // Using same video file for audio
    this.audio.style.display = "none";
    document.body.appendChild(this.audio);
  }

  public init() {
    const editor = this.editor;
    let playUnmount: VoidFunction | null = null;

    editor.ui.componentFactory.add('badApple', locale => {
      const buttonView = new ButtonView(locale);

      buttonView.set({
        label: 'Loading Bad Apple...',
        tooltip: true,
        withText: true,
        isEnabled: false
      });

      buttonView.on('execute', async () => {
        if ( playUnmount ) {
          playUnmount();
          playUnmount = null;

          buttonView.set({
            label: 'Play Bad Apple',
            isEnabled: true
          });
        } else {
          buttonView.set({
            label: 'Stop Bad Apple...',
          });

          playUnmount = await this.play();
        }
      });

      // Update button when prerendering completes
      this.prerenderPromise.then(() => {
        buttonView.set({
          label: 'Play Bad Apple',
          isEnabled: true
        });
      });

      return buttonView;
    });
  }

  public play() {
    this._createScreenTable();
    return this._startAnimation();
  }

  private _createScreenTable() {
    const editor = this.editor;
    const model = editor.model;
    const badAppleConfig = editor.config.get("badApple")!;

    model.change((writer) => {
      // Clear content
      const root = model.document.getRoot()!;
      writer.remove(writer.createRangeIn(root));

      // Create table
      const table = writer.createElement("table", {
        headingRows: 0,
        headingColumns: 0,
      });
      writer.insert(table, root, "end");

      for (let i = 0; i < badAppleConfig.height; i++) {
        const tableRow = writer.createElement("tableRow");
        writer.insert(tableRow, table, "end");
        for (let j = 0; j < badAppleConfig.width; j++) {
          const tableCell = writer.createElement("tableCell");
          writer.insert(tableCell, tableRow, "end");
          const paragraph = writer.createElement("paragraph");
          writer.insert(paragraph, tableCell, "end");
        }
      }
    });
  }

  private async _startAnimation() {
    let frameIndex = 0;
    const editor = this.editor;
    const { sampleRate, width, height } = editor.config.get("badApple")!;
    const frames = await this.prerenderPromise;

    // Start audio playback
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.play().catch(console.error);
    }

    const intervalId = setInterval(() => {
      if (frameIndex >= frames.length) {
        clearInterval(intervalId);
        this._stopAudio();
        return;
      }

      const frameBuffer = frames[frameIndex];
      const frameView = new Uint8Array(frameBuffer);

      editor.model.change((writer) => {
        const root = editor.model.document.getRoot()!;
        const table = root.getChild(0) as ModelElement;

        for (let y = 0; y < height; y++) {
          const row = table.getChild(y) as ModelElement;

          for (let x = 0; x < width; x++) {
            const cell = row.getChild(x) as ModelElement;

            const bitIndex = y * width + x;
            const byteIndex = Math.floor(bitIndex / 8);
            const bitInByte = bitIndex % 8;
            const isSet = (frameView[byteIndex] & (1 << bitInByte)) !== 0;

            if (isSet) {
              writer.setAttribute("tableCellBackgroundColor", "#000000", cell);
            } else {
              writer.removeAttribute("tableCellBackgroundColor", cell);
            }
          }
        }
      });

      frameIndex++;
    }, sampleRate);

    return () => {
      window.clearInterval(intervalId);
      this._stopAudio();
      this._clearDocument();
    };
  }

  private _stopAudio() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  private _clearDocument() {
    const editor = this.editor;
    const model = editor.model;

    model.change((writer) => {
      const root = model.document.getRoot()!;
      writer.remove(writer.createRangeIn(root));
    });
  }

  public destroy() {
    if (this.audio) {
      document.body.removeChild(this.audio);
      this.audio = null;
    }
    super.destroy();
  }
}

declare module "ckeditor5" {
  interface EditorConfig {
    badApple?: PrerenderBadAppleConfig;
  }
}
