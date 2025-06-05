import Axios from "axios";
import store, { setStore } from "../store";
// import router from "../router";

const {
  VITE_BASE_URL: baseURL,
  VITE_USER_URL,
  VITE_LAND_URL,
} = import.meta.env;

// console.log({ baseURL });
const http = Axios.create({
  baseURL,
});

let refreshing = false;
const pendingQueue = [];

function getToken(isRefresh) {
  const key = isRefresh ? "refreshToken" : "token"; //"accessToken";
  return store.state.loginData[key];
}

http.interceptors.request.use(
  (config) => {
    config.url = config.url
      .replace("$auth", VITE_USER_URL)
      .replace("$land", VITE_LAND_URL);
    let token = getToken();
    if (token) {
      if (!config.url.includes(VITE_LAND_URL)) {
        token = "Bearer " + token;
      }
      config.headers["Authorization"] = token;
    }
    return config;
  },
  (err) => {
    return Promise.reject(err);
  }
);

http.interceptors.response.use(
  async (res) => {
    const data = res.data;
    if (typeof data == "object" && data && "code" in data) {
      if (data.code != 200 && data.code != "SUCCESS") {
        data.msg = data.message || `${data.code} error`;
        // handleMsg(200, data.code, msg, res.config);
        const pending = await handleError(200, res.config, data);
        if (pending) {
          return pending;
        }
        const error = new Error(data.msg);
        error.code = data.code;
        throw error;
      }
      if ("data" in data) {
        return data;
      }
    }
    return res;
  },
  async (error) => {
    // , status, statusText, config = {}
    const { data = {}, status, config = {} } = error.response || {};
    const msg = data.message || error.message;
    const pending = await handleError(status, config, {
      ...data,
      msg,
    });
    if (pending) {
      return pending;
    }
    error.message = msg;
    // error.code = data.code;
    return Promise.reject(error);
  }
);

async function handleError(status, config, data) {
  if (refreshing) {
    return new Promise((resolve) => {
      pendingQueue.push({
        config,
        resolve,
      });
    });
  }
  let msg = data.msg || "Unknown error";
  // console.log(data);
  if (status == 401 || data.code == 401) {
    // msg = "Your session has expired. Please sign in to continue.";
    store.commit("logout");
    location.href = VITE_HOME_URL + "/quick-login?type=chat";
  } else if (!config.noTip) {
    if (msg.length < 80) window.$toast(msg);
    else window.$alert(msg);
  }
}

export default http;
