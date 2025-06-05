<template>
  <div class="al-c bg-f1">
    <a
      v-for="it in list"
      :key="it.icon"
      :href="it.link"
      target="_blank"
      class="flex-1 ta-c py-3 hover-1"
    >
      <img :src="`/img/contact/icon_${it.icon}.svg`" width="20" />
    </a>
  </div>
</template>

<script>
export default {
  data() {
    return {
      list: [
        {
          icon: "web",
          link: "https://www.4everland.org/",
        },
        {
          icon: "x",
          link: "https://twitter.com/4everland_org",
        },
        {
          icon: "discord",
          link: "https://discord.com/invite/Cun2VpsdjF",
        },
        {
          icon: "tg",
          link: "https://t.me/org_4everland",
        },
        {
          icon: "medium",
          link: "https://4everland.medium.com/",
        },
      ],
    };
  },
};
</script>