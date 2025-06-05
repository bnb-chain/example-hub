<style lang="scss">
.chat-menu-list {
  .q-hoverable:hover > .q-focus-helper {
    background: #e9eff5;
    opacity: 0.6;
  }
}
</style>

<script setup>
import importBtn from "./import-btn.vue";
</script>

<template>
  <div class="h-flex h100p">
    <div class="pa-3 al-c">
      <a href="/" class="al-c plain">
        <img
          src="https://dashboard.4everland.org/img/svg/logo-m.svg"
          style="height: 24px"
        />
        <span class="fz-16 ml-1 fw-b">4EVERChat</span>
      </a>
      <q-btn class="ml-auto" dense flat @click="addMenu">
        <img src="/img/edit.svg" width="22" />
        <q-tooltip> New chat </q-tooltip>
      </q-btn>
    </div>
    <q-scroll-area
      class="flex-1 w100p"
      :thumb-style="{
        right: '2px',
        width: '3px',
        opacity: 0.35,
      }"
    >
      <div class="pa-3 chat-menu-list">
        <div class="mb-1" v-for="(it, i) in chatMenus" :key="it.id">
          <div
            class="pa-2 bdrs-5 bg-hover-2 hover-wrap"
            :class="{
              'bg-btn-on': path == '/' && i == menuIdx,
            }"
            flat
            @click="onMenu(i)"
          >
            <div class="w100p al-c">
              <span class="line-1 pr-4">{{ it.title || "New chat" }}</span>
              <div
                class="ml-auto pos-r hover-wrap1"
                :class="{
                  'hover-show': i != menuIdx,
                }"
              >
                <q-icon name="more_horiz" size="18px"></q-icon>
                <div
                  class="pos-a right-0 bg-fff bdrs-5 ov-h z-1000 hover-show1"
                  style="top: 100%"
                >
                  <q-list style="width: 100px">
                    <q-item
                      clickable
                      v-close-popup
                      dense
                      @click.stop="onRename(it)"
                    >
                      <q-item-section>
                        <div class="al-c">
                          <q-icon name="mode_edit"></q-icon>
                          <span class="ml-1">Rename</span>
                        </div>
                      </q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      dense
                      @click.stop="onDel(it)"
                      v-show="!(chatMenus.length == 1 && chatLogs.length == 0)"
                    >
                      <q-item-section class="text-red">
                        <div class="al-c">
                          <q-icon name="delete_outline"></q-icon>
                          <span class="ml-1">Delete</span>
                        </div>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-scroll-area>
    <div class="pa-3">
      <q-btn
        unelevated
        v-if="!token"
        color="primary"
        class="w100p"
        @click="onLogin"
        >Sign in</q-btn
      >
      <import-btn />
    </div>
    <div v-if="apiKey">
      <div class="bg-btn-1 al-c px-4 py-3" @click="$router.push('/settings')">
        <jazz-icon v-if="userInfo.uid" :hash="userInfo.uid" :size="28" />
        <img v-else src="/img/chat/avatar.svg" width="28" />
        <span class="ml-2">{{ userInfo.uname || "Visitor" }}</span>
        <img class="ml-auto" src="/img/chat/settings.svg" width="22" />
      </div>
      <div class="px-4 bg-f1">
        <div style="border-top: 1px solid #e2e8f0"></div>
      </div>
    </div>
    <chat-menu-social />
  </div>
</template>

<script>
import md5 from "md5";
import { mapState } from "vuex";

export default {
  data() {
    return {
      loadingUser: false,
    };
  },
  computed: {
    ...mapState({
      token: (s) => s.loginData.token,
      userInfo: (s) => s.userInfo,
      chatMenus: (s) => s.chatMenus,
      menuIdx: (s) => s.menuIdx,
      apiKey: (s) => s.apiKey,
      asPC: (s) => s.asPC,
      chatLogs: (s) => s.chatLogs,
    }),
    path() {
      return this.$route.path;
    },
  },
  created() {
    if (this.token && !this.userInfo.uid) {
      this.getUserInfo();
    }
    if (!this.chatMenus.length) {
      this.addMenu();
    }
    this.$bus.on("sign-in", () => {
      this.onLogin();
    });
  },
  methods: {
    onLogin() {
      // this.$router.replace("/login");
      if (this.$inDev) {
        localStorage._login = 1;
      }
      location.href = this.$getHomeUrl("/quick-login?type=chat");
    },
    async onDel(it) {
      let data = await localforage.getItem("chat-" + it.id);
      if (data && data != "[]") {
        let { title } = it;
        if (title) title = `(${title})`;
        await this.$confirm(`Are you sure to delete the chat ${title}?`);
      }
      const chatMenus = [...this.chatMenus];
      const idx = chatMenus.findIndex((p) => p.id == it.id);
      await localforage.removeItem("chat-" + it.id);
      chatMenus.splice(idx, 1);
      this.$setStore({
        chatMenus,
        menuIdx: 0,
      });
      if (!this.chatMenus.length) {
        this.addMenu();
      }
    },
    async onRename(it) {
      let val = await window.$prompt("Rename the chat", {
        value: it.title,
      });
      val = val.trim();
      if (!val) return;

      this.$store.commit("updateChatMenu", {
        id: it.id,
        title: val,
      });
    },
    onMenu(i) {
      if (this.path != "/") {
        this.$router.push("/");
      }
      this.$setStore({
        menuIdx: i,
      });

      this.$bus.emit("close-left");
      if (this.asPC) {
        this.$bus.emit("chat-focus");
      }
    },
    async addMenu() {
      if (this.chatMenus.length >= 20) {
        return this.$alert(
          "You’ve reached your Chat limit. Please delete Chat before proceeding."
        );
      }
      const row = this.chatMenus[0];
      if (!row || row.title) {
        const rand = (Math.random() + "").substring(2, 6);
        const id = "chat-" + md5(Date.now() + rand).substring(0, 6);
        await this.$setStore({
          chatMenus: [
            {
              id,
            },
            ...this.chatMenus,
          ],
          chatLogs: [],
        });
      }
      this.onMenu(0);
    },
    async getUserInfo() {
      try {
        this.loadingUser = true;
        const { data } = await this.$http.get("$auth/user");
        const { uid = "", username } = data;
        data.uname = (username || uid).cutStr(4, 4);
        this.$setStore({
          userInfo: data,
        });
      } catch (error) {
        console.log(error);
      }
      this.loadingUser = false;
    },
  },
};
</script>