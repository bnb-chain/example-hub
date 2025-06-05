<template>
  <div class="mt-3" v-show="!apiKey">
    <q-btn
      unelevated
      color="info"
      class="w100p"
      @click="$bus.emit('show-import')"
      >Import a key</q-btn
    >
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  computed: {
    ...mapState({
      token: (s) => s.loginData.token,
      keyList: (s) => s.keyList,
      apiKey: (s) => s.apiKey,
      importKey: (s) => s.importKey,
    }),
    myKeyList() {
      const list = [...this.keyList];
      if (this.importKey) {
        const { name, value } = this.importKey;
        list.push({
          name: name + ` - (import)`,
          key: value,
        });
      }
      return list;
    },
  },
  data() {
    return {
      isEpand: false,
      loading: false,
      hasGot: false,
    };
  },
  watch: {
    isEpand(val) {
      if (val) this.getList();
    },
    importKey(val) {
      if (!val) {
        this.hasGot = false;
        this.getList();
      }
    },
  },
  created() {
    // && !this.apiKey
    this.getList();
  },
  methods: {
    setKey(apiKey) {
      this.$setStore({
        apiKey,
      });
    },
    showImport() {
      this.$bus.emit("show-import");
    },
    goApiManage() {
      window.open(this.$getHomeUrl("/ai-rpc?tab=Keys"));
    },
    async onCreate() {
      try {
        this.loading = true;
        await this.$http.post("/rpc/ai/manager/keys", {
          name: "autoGen",
          limit: "",
        });
        await this.getList();
      } catch (error) {
        console.log(error);
      }
      this.loading = false;
    },
    async getList() {
      if (!this.token) return;
      try {
        const { data } = await this.$http.get("/rpc/ai/manager/keys", {
          noTip: true,
        });
        this.$setStore({
          keyList: data.items,
        });
        let apiKey = this.apiKey;
        if (apiKey) {
          const isIn = this.myKeyList.find((it) => it.key == apiKey);
          if (!isIn) apiKey = "";
        }
        if (!apiKey) {
          apiKey = this.myKeyList[0]?.key || "";
        }
        this.setKey(apiKey);
        if (!this.keyList.length && !this.hasGot) {
          this.hasGot = true;
          this.onCreate();
        }
      } catch (error) {
        console.log(error);
      }
    },
  },
};
</script>