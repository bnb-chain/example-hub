<script setup>
import SetKey from "./set-key.vue";
</script>

<template>
  <div>
    <div class="mt-9 pa-4 d-flex flex-center">
      <div class="w100p" style="max-width: 550px">
        <div class="al-c mb-5">
          <jazz-icon v-if="logged" :hash="userInfo.uid" :size="40" />
          <img v-else src="/img/chat/avatar.svg" width="40" />
          <div class="ml-3 lh-1">
            <div class="fw-b fz-16">{{ userInfo.uname || "Visitor" }}</div>
            <div class="text-info mt-2" v-if="logged">
              Balance: {{ userInfo.balance || "-" }} LAND
            </div>
          </div>

          <q-btn class="ml-auto bd-1" flat dense @click="onSign">
            <img
              :src="`/img/chat/${logged ? 'sign-out' : 'sign-in'}.svg`"
              width="20"
            />
            <span class="ml-2">{{ logged ? "Sign out" : "Sign in" }}</span>
          </q-btn>
        </div>
        <div class="row q-col-gutter-md" vif="logged">
          <div class="col-6" v-for="it in links" :key="it.label">
            <a
              target="_blank"
              :href="$getHomeUrl(it.href)"
              class="bg-left bdrs-5 pa-3 al-c bg-hover-2 plain"
            >
              <span class="fz-16 label-2 fw-b">{{ it.label }}</span>
              <img class="ml-auto" src="/img/chat/link.svg" width="24" />
            </a>
          </div>
        </div>
        <set-key />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  data() {
    return {};
  },
  computed: {
    ...mapState({
      userInfo: (s) => s.userInfo,
      apiKey: (s) => s.apiKey,
      keyList: (s) => s.keyList,
    }),
    logged() {
      return !!this.userInfo.uid;
    },
    links() {
      const notMyKey = !this.keyList.find((it) => it.key == this.apiKey);
      return [
        {
          label: "Deposit LAND",
          href: "/billing",
        },
        {
          label: "Activities",
          href: notMyKey
            ? "/ai-rpc?tab=Keys"
            : "/ai-rpc/key/autoGen/" + this.apiKey,
        },
        {
          label: "LLMs",
          href: "/ai-rpc?tab=Models",
        },
        {
          label: "AI RPC",
          href: "https://docs.4everland.org/ai/ai-rpc",
        },
      ];
    },
  },
  created() {
    if (this.logged) {
      this.getBalance();
    }
  },
  methods: {
    onSign() {
      if (this.logged) {
        this.$store.commit("logout");
      } else {
        this.$bus.emit("sign-in");
      }
    },
    async getBalance() {
      const { data } = await this.$http.get("$land/assets");
      this.$setStore({
        userInfo: {
          ...this.userInfo,
          balance: (Number(data.land) / 1e18).toFixed(0),
        },
      });
    },
  },
};
</script>