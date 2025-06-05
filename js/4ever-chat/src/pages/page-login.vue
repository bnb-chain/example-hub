<template>
  <div class="pa-4">Redirecting...</div>
</template>

<script>
import { mapState } from "vuex";
export default {
  computed: {
    ...mapState({
      token: (s) => s.loginData.token,
    }),
  },
  created() {
    let { t, token, ...query } = this.$route.query;
    if (!token) token = t;
    token = decodeURIComponent(token);
    if (token) {
      if (
        this.$inDev &&
        !localStorage._login &&
        !/localhost/.test(location.host)
      ) {
        location.href =
          "http://localhost:9000/login?t=" + encodeURIComponent(token);
        return;
      }
      localStorage._login = "";
      this.$setStore({
        loginData: {
          token,
        },
      });
    }
    if (!this.token) {
      location.href = this.$getHomeUrl("/quick-login?type=chat");
    } else {
      this.$router.replace({
        path: "/",
        query,
      });
    }
  },
};
</script>