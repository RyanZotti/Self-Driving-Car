from ai.Trainer import Trainer, parse_args


args = parse_args()
trainer = Trainer(
    overfit=args['overfit'],
    data_path=args["data_path"],
    batch_size=int(args['batch_size']),
    postgres_host=args["postgres_host"],
    port=args['port'],
    model_base_directory=args['model_base_directory'],
    model_id=args['model_id'],
    total_epochs=args["epochs"],
    image_scale=args['image_scale'],
    crop_percent=args['crop_percent']
)
trainer.train()
