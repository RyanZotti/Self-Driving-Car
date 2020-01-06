from ai.Trainer import Trainer, parse_args


args = parse_args()
trainer = Trainer(
    data_path=args["data_path"],
    postgres_host=args["postgres_host"],
    port=args['port'],
    model_base_directory=args['model_base_directory'],
    total_epochs=args["epochs"],
    image_scale=args['image_scale'],
    crop_percent=args['crop_percent']
)
trainer.train()
