// 创建样式表
const createThemeStyles = () => {
  const style = document.createElement('style');
  document.head.appendChild(style);
  
  style.textContent = `
    :root {
        --bg: #181818;
        --button-bg: rgb(50, 50, 50);
        --bg-sb: rgb(50, 50, 50);
        --bg-hover: rgb(50, 50, 50);
        --button-bg-hover: rgb(50, 50, 50);
        --text: rgb(214,214, 214);
        --text-hover: rgb(214,214, 214);
        --text-selected: rgb(235, 235, 235);
        --gear: rgb(214,214, 214);
        --gear-selected: rgb(214,214, 214);
        --icon: rgb(214,214, 214);
        --icon-hover: rgb(214,214, 214);
        --border: #484848;
        --text-sb: #848484;
        --REC-icon: #e01b1b;
        --bg-selected: #0078d7;
    }

    @media (prefers-color-scheme: darkest) {
      :root {
        --bg:rgb(24, 24, 24);
        --button-bg: rgb(50, 50, 50);
        --bg-sb: rgb(50, 50, 50);
        --bg-hover: rgb(50, 50, 50);
        --button-bg-hover: rgb(50, 50, 50);
        --text: rgb(214,214, 214);
        --text-hover: rgb(214,214, 214);
        --text-selected: rgb(235, 235, 235);
        --gear: rgb(214,214, 214);
        --gear-selected: rgb(214,214, 214);
        --icon: rgb(214,214, 214);
        --icon-hover: rgb(214,214, 214);
        --border: #484848;
        --text-sb: #848484;
        --REC-icon: #e01b1b;
        --bg-selected: #0078d7;
      }
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: rgb(55, 55, 55);
        --button-bg: rgb(80, 80, 80);
        --bg-sb: rgb(80, 80, 80);
        --bg-hover: rgb(80, 80, 80);
        --button-bg-hover: rgb(80, 80, 80);
        --text: rgb(215, 215, 215);
        --text-hover: rgb(215, 215, 215);
        --text-selected: rgb(235, 235, 235);
        --gear: rgb(215, 215, 215);
        --gear-selected: rgb(215, 215, 215);
        --icon: rgb(215, 215, 215);
        --icon-hover: rgb(215, 215, 215);
        --border: #555555;
        --text-sb: #999999;
        --REC-icon: #e01b1b;
        --bg-selected: #0078d7;     
      }
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: rgb(209, 209, 209);
        --button-bg: rgb(184,184, 184);
        --bg-sb: rgb(184,184, 184);
        --bg-hover: rgb(184,184, 184);
        --button-bg-hover: rgb(184,184, 184);
        --text: rgb(37,37,37);
        --text-hover: rgb(37,37,37);
        --text-selected: rgb(235, 235, 235);
        --gear: rgb(37,37,37);
        --gear-selected: rgb(37,37,37);
        --icon: rgb(37,37,37);
        --icon-hover: rgb(37,37,37);
        --border: #a0a0a0;
        --text-sb: #666666;
        --REC-icon: #e01b1b;
        --bg-selected: #0078d7;
      }
    }

    @media (prefers-color-scheme: lightest) {
      :root {
        --bg: rgb(252, 252, 252);
        --button-bg: rgb(240, 240, 240);
        --bg-sb: rgb(240, 240, 240);
        --bg-hover: rgb(240, 240, 240);
        --button-bg-hover: rgb(240, 240, 240);
        --text: rgb(48, 48, 48);
        --text-hover: rgb(48, 48, 48);
        --text-selected: rgb(235, 235, 235);
        --gear: rgb(48, 48, 48);
        --gear-selected: rgb(48, 48, 48);
        --icon: rgb(48, 48, 48);
        --icon-hover: rgb(48, 48, 48);
        --border: #c4c4c4;
        --text-sb: #909090;
        --REC-icon: #e01b1b;
        --bg-selected: #0078d7;
      }
    }
  `;
};

export const initializeTheme = () => {
  createThemeStyles();
};