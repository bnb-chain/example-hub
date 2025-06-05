import { createStore } from "vuex";
import configKeys from "./config-keys";

const SET_DATA = "setData";

const storInit = {
  loginData: {},
  userInfo: {},
  aiModels: [],
  chatMenus: [],
  menuIdx: 0,
  chatLogs: [],
  keyList: [],
  apiKey: "",
  importKey: null,
};
const storState = {
  ...storInit,
};
for (const key in storState) {
  let val = localStorage[key];
  try {
    if (val) storState[key] = JSON.parse(val);
  } catch (error) {
    console.log(key, error);
  }
}

const store = createStore({
  modules: {},
  state: {
    ...storState,
    nowDate: new Date(),
    isFocus: true,
    showProgress: false,
    checkModelIds: [],
    jobModelIds: [],
    configMap: {},
    configModelId: null, // for settings
    configKeys,
    chatLogMap: {},
    isLeftOpen: false,
    isRightOpen: false,
    asPC: true,
  },
  getters: {
    chatMenu(s) {
      return s.chatMenus[s.menuIdx];
    },
  },
  mutations: {
    [SET_DATA](state, data) {
      for (const key in data) {
        state[key] = data[key];
      }
    },
    logout(state) {
      console.log("logout");
      const apiKey = state.importKey?.value || "";
      setStore({
        loginData: {},
        userInfo: {},
        apiKey,
        keyList: [],
        // importKey: null,
      });
    },
    updateLogMap(state, logList) {
      const { chatLogMap, chatMenus, menuIdx } = state;
      const { id } = chatMenus[menuIdx] || {};
      if (!id) return console.log("no chat", id);
      setState({
        chatLogMap: {
          ...chatLogMap,
          [id]: logList,
        },
      });
    },
    updateChatMenu(state, body) {
      let chatMenus = [...state.chatMenus];
      let { menuIdx } = state;
      if (body.id) {
        menuIdx = chatMenus.findIndex((item) => item.id == body.id);
        if (menuIdx == -1) return;
      }
      chatMenus[menuIdx] = {
        ...chatMenus[menuIdx],
        ...body,
      };
      setStore({
        chatMenus,
      });
    },
    updateChatLog(state, body) {
      const chatLogs = [...state.chatLogs];
      const idx = chatLogs.findIndex((it) => it.id == body.id);
      if (idx == -1) {
        return console.log("chat not found", body);
      }
      if (body._delete) {
        chatLogs.splice(idx, 1);
      } else {
        chatLogs[idx] = {
          ...chatLogs[idx],
          ...body,
        };
      }
      setStore({
        chatLogs,
      });
    },
  },
  actions: {},
});

export const setState = (data) => {
  store.commit(SET_DATA, data);
};

export const setStore = (data) => {
  for (const key in data) {
    try {
      localStorage[key] = JSON.stringify(data[key]);
    } catch (error) {
      console.log(key, error);
    }
  }
  setState(data);
};

window.onblur = () => {
  setState({
    isFocus: false,
  });
};
window.onfocus = () => {
  setState({
    isFocus: true,
  });
};

setInterval(() => {
  setState({
    nowDate: new Date(),
  });
}, 1e3);

export default store;
